"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Post } from "@/types/post";
import type {
  SseConnectedEvent,
  SsePostContentEditedEvent,
  SsePostContentTypeEditedEvent,
  SseThreadUserCountEvent,
} from "@/types/sse";

interface UseThreadSseOptions {
  /** 초기 새 레스 수신 여부 (기본값: true) */
  initialReceiveNewPosts?: boolean;
  onNewPost?: (post: Post) => void;
  onPostContentEdited?: (data: SsePostContentEditedEvent) => void;
  onPostContentTypeEdited?: (data: SsePostContentTypeEditedEvent) => void;
}

interface UseThreadSseResult {
  /** 연결 수립 후 서버가 부여한 connectionId */
  connectionId: string | null;
  /** 스레드 로그인 실시간 접속자 수 */
  userCount: number | null;
  /** 새 레스 수신 여부를 서버에 PATCH로 변경 */
  setReceiveNewPosts: (value: boolean) => Promise<void>;
  /** SSE 연결 상태 */
  connectionStatus: "connecting" | "connected" | "reconnecting" | "disconnected";
}

/**
 * 스레드 SSE 구독 훅.
 *
 * boardKey 또는 threadIndex가 바뀌면 이전 연결을 닫고 새로 구독합니다.
 * 컴포넌트 언마운트 시에도 연결이 자동으로 해제됩니다.
 *
 * 이벤트 콜백(onNewPost 등)은 렌더마다 최신 함수를 참조하므로,
 * 호출부에서 useCallback으로 감쌀 필요가 없습니다.
 */
export function useThreadSse(
  boardKey: string,
  threadIndex: number,
  options: UseThreadSseOptions = {},
): UseThreadSseResult {
  const { initialReceiveNewPosts = true } = options;

  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "reconnecting" | "disconnected"
  >("connecting");

  // connectionId는 PATCH 호출에서 클로저가 아닌 ref로 참조
  const connectionIdRef = useRef<string | null>(null);
  // 클라이언트가 원하는 최신 수신 상태를 유지 (재연결 시 서버 재동기화에 사용)
  const desiredReceiveNewPostsRef = useRef(initialReceiveNewPosts);

  // 콜백은 ref로 보관 → effect 재실행 없이 최신 함수 유지
  const callbacksRef = useRef(options);
  // eslint-disable-next-line react-hooks/refs
  callbacksRef.current = options;

  useEffect(() => {
    desiredReceiveNewPostsRef.current = initialReceiveNewPosts;
  }, [initialReceiveNewPosts]);

  const syncReceiveNewPosts = useCallback(
    async (connId: string, value: boolean) => {
      await fetch(`/api/sse/boards/${boardKey}/threads/${threadIndex}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: connId, receiveNewPosts: value }),
      });
    },
    [boardKey, threadIndex],
  );

  useEffect(() => {
    const url =
      `/api/sse/boards/${boardKey}/threads/${threadIndex}` +
      `?receiveNewPosts=${initialReceiveNewPosts}`;

    const es = new EventSource(url);

    es.addEventListener("connected", (e: MessageEvent) => {
      const data = JSON.parse(e.data) as SseConnectedEvent;
      connectionIdRef.current = data.connectionId;
      setConnectionId(data.connectionId);
      setConnectionStatus("connected");

      // EventSource 내부 재연결로 connectionId가 바뀔 수 있으므로 서버 상태를 다시 맞춘다.
      void syncReceiveNewPosts(
        data.connectionId,
        desiredReceiveNewPostsRef.current,
      );
    });

    es.addEventListener("thread:user-count", (e: MessageEvent) => {
      const data = JSON.parse(e.data) as SseThreadUserCountEvent;
      setUserCount(data.count);
    });

    es.addEventListener("thread:new-post", (e: MessageEvent) => {
      const post = JSON.parse(e.data) as Post;
      callbacksRef.current.onNewPost?.(post);
    });

    es.addEventListener("thread:post-content-edited", (e: MessageEvent) => {
      const data = JSON.parse(e.data) as SsePostContentEditedEvent;
      callbacksRef.current.onPostContentEdited?.(data);
    });

    es.addEventListener("thread:post-content-type-edited", (e: MessageEvent) => {
      const data = JSON.parse(e.data) as SsePostContentTypeEditedEvent;
      callbacksRef.current.onPostContentTypeEdited?.(data);
    });

    return () => {
      // close() → 서버 request.signal abort → unsubscribeThreadClient 자동 실행
      es.close();
      connectionIdRef.current = null;
      setConnectionId(null);
      setUserCount(null);
      setConnectionStatus("disconnected");
    };
  }, [boardKey, threadIndex, initialReceiveNewPosts, syncReceiveNewPosts]);

  const setReceiveNewPosts = useCallback(
    async (value: boolean) => {
      desiredReceiveNewPostsRef.current = value;
      const connId = connectionIdRef.current;
      if (!connId) return;
      await syncReceiveNewPosts(connId, value);
    },
    [syncReceiveNewPosts],
  );

  return { connectionId, userCount, setReceiveNewPosts, connectionStatus };
}
