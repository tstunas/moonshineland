/**
 * SSE 구독자 관리 및 브로드캐스트 유틸리티
 *
 * - 게시판 구독자: 게시판 SSE를 직접 수신하는 클라이언트
 * - 스레드 구독자: 스레드 SSE를 수신하는 클라이언트
 *   → 스레드 구독자는 게시판 사용자 수 집계에 포함되지만, 게시판 SSE 이벤트는 받지 않음
 *
 * Node.js 단일 프로세스(자체 호스팅) 환경을 전제로 인메모리 상태를 사용합니다.
 */

import type { ContentType } from "@/types/post";
import type { Post } from "@/types/post";

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface SseClient {
  connectionId: string;
  /** 로그인 유저: "user:{userId}", 비로그인: "anon:{uuid}" */
  clientKey: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  /** 새 레스 수신 여부 (스레드 구독자만 유효) */
  receiveNewPosts: boolean;
}

interface SseStoreState {
  boardClients: Map<string, Map<string, SseClient>>;
  threadClients: Map<string, Map<string, SseClient>>;
  boardCountCache: Map<string, number>;
  threadCountCache: Map<string, number>;
}

const globalForSseStore = globalThis as typeof globalThis & {
  __MOONSHINE_SSE_STORE__?: SseStoreState;
};

function getSseStoreState(): SseStoreState {
  if (!globalForSseStore.__MOONSHINE_SSE_STORE__) {
    globalForSseStore.__MOONSHINE_SSE_STORE__ = {
      boardClients: new Map(),
      threadClients: new Map(),
      boardCountCache: new Map(),
      threadCountCache: new Map(),
    };
  }

  return globalForSseStore.__MOONSHINE_SSE_STORE__;
}

// ─── 내부 상태 ────────────────────────────────────────────────────────────────

const sseStoreState = getSseStoreState();

/** boardKey → connectionId → SseClient */
const boardClients = sseStoreState.boardClients;

/** `${boardKey}:${threadIndex}` → connectionId → SseClient */
const threadClients = sseStoreState.threadClients;

/** 마지막으로 계산된 게시판 사용자 수 캐시 */
const boardCountCache = sseStoreState.boardCountCache;

/** 마지막으로 계산된 스레드 사용자 수 캐시 (`${boardKey}:${threadIndex}` 키) */
const threadCountCache = sseStoreState.threadCountCache;

// ─── 인코딩 유틸 ──────────────────────────────────────────────────────────────

const encoder = new TextEncoder();

function encodeEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  );
}

function sendToClient(client: SseClient, event: string, data: unknown) {
  try {
    client.controller.enqueue(encodeEvent(event, data));
  } catch {
    // 연결이 이미 닫힌 경우 무시
  }
}

// ─── 사용자 수 계산 ──────────────────────────────────────────────────────────

function isLoggedIn(clientKey: string): boolean {
  return clientKey.startsWith("user:");
}

function countUniqueKeys(clients: Map<string, SseClient>): number {
  const keys = new Set<string>();
  for (const client of clients.values()) {
    if (isLoggedIn(client.clientKey)) keys.add(client.clientKey);
  }
  return keys.size;
}

function getBoardUserCount(boardKey: string): number {
  const keys = new Set<string>();

  // 게시판 SSE를 직접 구독 중인 클라이언트
  const bc = boardClients.get(boardKey);
  if (bc) {
    for (const c of bc.values()) {
      if (isLoggedIn(c.clientKey)) keys.add(c.clientKey);
    }
  }

  // 해당 게시판에 속한 스레드를 구독 중인 클라이언트 (집계에 포함)
  for (const [key, tc] of threadClients) {
    if (key.startsWith(`${boardKey}:`)) {
      for (const c of tc.values()) {
        if (isLoggedIn(c.clientKey)) keys.add(c.clientKey);
      }
    }
  }

  return keys.size;
}

// ─── 사용자 수 방송 ──────────────────────────────────────────────────────────

function broadcastBoardUserCount(boardKey: string) {
  const count = getBoardUserCount(boardKey);
  boardCountCache.set(boardKey, count);
  const bc = boardClients.get(boardKey);
  if (!bc) return;
  for (const client of bc.values()) {
    sendToClient(client, "board:user-count", { boardKey, count });
  }
}

function broadcastThreadUserCount(boardKey: string, threadIndex: number) {
  const threadKey = `${boardKey}:${threadIndex}`;
  const tc = threadClients.get(threadKey);
  if (!tc) return;
  const count = countUniqueKeys(tc);
  threadCountCache.set(threadKey, count);
  for (const client of tc.values()) {
    sendToClient(client, "thread:user-count", { boardKey, threadIndex, count });
  }
}

// ─── 게시판 구독 관리 ─────────────────────────────────────────────────────────

export function subscribeBoardClient(boardKey: string, client: SseClient) {
  if (!boardClients.has(boardKey)) {
    boardClients.set(boardKey, new Map());
  }
  boardClients.get(boardKey)!.set(client.connectionId, client);
  broadcastBoardUserCount(boardKey);
}

export function unsubscribeBoardClient(
  boardKey: string,
  connectionId: string,
) {
  const bc = boardClients.get(boardKey);
  if (!bc) return;
  bc.delete(connectionId);
  if (bc.size === 0) boardClients.delete(boardKey);
  broadcastBoardUserCount(boardKey);
}

// ─── 스레드 구독 관리 ─────────────────────────────────────────────────────────

export function subscribeThreadClient(
  boardKey: string,
  threadIndex: number,
  client: SseClient,
) {
  const threadKey = `${boardKey}:${threadIndex}`;
  if (!threadClients.has(threadKey)) {
    threadClients.set(threadKey, new Map());
  }
  threadClients.get(threadKey)!.set(client.connectionId, client);

  broadcastThreadUserCount(boardKey, threadIndex);
  broadcastBoardUserCount(boardKey);
}

export function unsubscribeThreadClient(
  boardKey: string,
  threadIndex: number,
  connectionId: string,
) {
  const threadKey = `${boardKey}:${threadIndex}`;
  const tc = threadClients.get(threadKey);
  if (!tc) return;
  tc.delete(connectionId);
  if (tc.size === 0) threadClients.delete(threadKey);

  broadcastThreadUserCount(boardKey, threadIndex);
  broadcastBoardUserCount(boardKey);
}

// ─── 스레드 구독 상태 변경 ────────────────────────────────────────────────────

/** 특정 연결의 새 레스 수신 여부를 변경합니다. */
export function setReceiveNewPosts(
  boardKey: string,
  threadIndex: number,
  connectionId: string,
  value: boolean,
): boolean {
  const threadKey = `${boardKey}:${threadIndex}`;
  const client = threadClients.get(threadKey)?.get(connectionId);
  if (!client) return false;
  client.receiveNewPosts = value;
  return true;
}

// ─── 스레드 이벤트 브로드캐스트 ──────────────────────────────────────────────

/**
 * 새 레스 브로드캐스트.
 * `receiveNewPosts === true` 상태인 클라이언트에게만 전송합니다.
 */
export function broadcastNewPost(
  boardKey: string,
  threadIndex: number,
  post: Post,
) {
  const threadKey = `${boardKey}:${threadIndex}`;
  const tc = threadClients.get(threadKey);

  if (!tc) return;
  for (const client of tc.values()) {
    if (client.receiveNewPosts) {
      sendToClient(client, "thread:new-post", post);
    }
  }
}

/**
 * 자동투하 템플릿이 실제 레스로 투하되었음을 브로드캐스트합니다.
 * 해당 스레드에 접속 중인 모든 클라이언트에게 전송합니다.
 */
export function broadcastAutoPostFired(
  boardKey: string,
  threadIndex: number,
  data: {
    autoPostId: number;
    autoPostSequence: number;
    postId: number;
    postOrder: number;
    createdAt: string;
  },
) {
  const threadKey = `${boardKey}:${threadIndex}`;
  const tc = threadClients.get(threadKey);
  if (!tc) return;
  for (const client of tc.values()) {
    sendToClient(client, "thread:auto-post-fired", data);
  }
}

/**
 * 레스 내용(content/rawContent) 수정 브로드캐스트.
 * 해당 스레드에 접속 중인 모든 클라이언트에게 전송합니다.
 */
export function broadcastPostContentEdited(
  boardKey: string,
  threadIndex: number,
  data: {
    postId: number;
    content: string;
    rawContent: string;
    isEdited: boolean;
    contentUpdatedAt: string;
    updatedAt: string;
  },
) {
  const threadKey = `${boardKey}:${threadIndex}`;
  const tc = threadClients.get(threadKey);
  if (!tc) return;
  for (const client of tc.values()) {
    sendToClient(client, "thread:post-content-edited", data);
  }
}

/**
 * 레스 ContentType 수정 브로드캐스트.
 * 해당 스레드에 접속 중인 모든 클라이언트에게 전송합니다.
 */
export function broadcastPostContentTypeEdited(
  boardKey: string,
  threadIndex: number,
  data: {
    postId: number;
    contentType: ContentType;
    updatedAt: string;
  },
) {
  const threadKey = `${boardKey}:${threadIndex}`;
  const tc = threadClients.get(threadKey);
  if (!tc) return;
  for (const client of tc.values()) {
    sendToClient(client, "thread:post-content-type-edited", data);
  }
}

/**
 * 레스 숨김 상태(isHidden) 변경 브로드캐스트.
 * 해당 스레드에 접속 중인 모든 클라이언트에게 전송합니다.
 */
export function broadcastPostVisibilityEdited(
  boardKey: string,
  threadIndex: number,
  data: {
    postId: number;
    isHidden: boolean;
    updatedAt: string;
  },
) {
  const threadKey = `${boardKey}:${threadIndex}`;
  const tc = threadClients.get(threadKey);
  if (!tc) return;
  for (const client of tc.values()) {
    sendToClient(client, "thread:post-visibility-edited", data);
  }
}
