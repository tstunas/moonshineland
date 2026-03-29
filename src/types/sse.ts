import type { ContentType } from "@/types/post";
import type { Post } from "@/types/post";

// ─── 서버 → 클라이언트 이벤트 ────────────────────────────────────────────────

/** 연결 수립 확인 이벤트 */
export interface SseConnectedEvent {
  connectionId: string;
}

/** 게시판 실시간 사용자 수 이벤트 */
export interface SseBoardUserCountEvent {
  boardKey: string;
  count: number;
}

/** 스레드 실시간 접속회원 수 이벤트 */
export interface SseThreadUserCountEvent {
  boardKey: string;
  threadIndex: number;
  count: number;
}

/** 새 레스 이벤트 (`receiveNewPosts` 상태인 클라이언트에게만 전송) */
export type SseNewPostEvent = Post;

/** 레스 내용 수정 이벤트 (스레드 접속 중 모든 클라이언트에게 전송) */
export interface SsePostContentEditedEvent {
  postId: number;
  content: string;
  rawContent: string;
  isEdited: boolean;
  contentUpdatedAt: string;
  updatedAt: string;
}

/** 레스 ContentType 수정 이벤트 (스레드 접속 중 모든 클라이언트에게 전송) */
export interface SsePostContentTypeEditedEvent {
  postId: number;
  contentType: ContentType;
  updatedAt: string;
}

/** 레스 숨김 상태 수정 이벤트 (스레드 접속 중 모든 클라이언트에게 전송) */
export interface SsePostVisibilityEditedEvent {
  postId: number;
  isHidden: boolean;
  updatedAt: string;
}

/** 자동투하 템플릿이 실제 투하로 소비되었음을 알리는 이벤트 */
export interface SseAutoPostFiredEvent {
  autoPostId: number;
  autoPostSequence: number;
  postId: number;
  postOrder: number;
  createdAt: string;
}

// ─── 이벤트 이름 상수 ─────────────────────────────────────────────────────────

export const SSE_EVENTS = {
  CONNECTED: "connected",
  BOARD_USER_COUNT: "board:user-count",
  THREAD_USER_COUNT: "thread:user-count",
  NEW_POST: "thread:new-post",
  AUTO_POST_FIRED: "thread:auto-post-fired",
  POST_CONTENT_EDITED: "thread:post-content-edited",
  POST_CONTENT_TYPE_EDITED: "thread:post-content-type-edited",
  POST_VISIBILITY_EDITED: "thread:post-visibility-edited",
} as const;

export type SseEventName = (typeof SSE_EVENTS)[keyof typeof SSE_EVENTS];

// ─── 클라이언트 → 서버 요청 ──────────────────────────────────────────────────

/** 새 레스 수신 상태 변경 요청 (PATCH /api/sse/boards/:boardKey/threads/:threadIndex) */
export interface PatchReceiveNewPostsRequest {
  connectionId: string;
  receiveNewPosts: boolean;
}
