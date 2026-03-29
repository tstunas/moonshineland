"use client";

import { useEffect, useState } from "react";

import type {
  SseBoardUserCountEvent,
  SseConnectedEvent,
} from "@/types/sse";

interface UseBoardSseResult {
  /** 연결 수립 후 서버가 부여한 connectionId */
  connectionId: string | null;
  /** 게시판 로그인 실시간 사용자 수 */
  userCount: number | null;
}

/**
 * 게시판 SSE 구독 훅.
 *
 * boardKey가 바뀌면 이전 연결을 닫고 새로 구독합니다.
 * 컴포넌트 언마운트 시에도 연결이 자동으로 해제됩니다.
 */
export function useBoardSse(boardKey: string): UseBoardSseResult {
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/sse/boards/${boardKey}`);

    es.addEventListener("connected", (e: MessageEvent) => {
      const data = JSON.parse(e.data) as SseConnectedEvent;
      setConnectionId(data.connectionId);
    });

    es.addEventListener("board:user-count", (e: MessageEvent) => {
      const data = JSON.parse(e.data) as SseBoardUserCountEvent;
      setUserCount(data.count);
    });

    return () => {
      // close() → 서버 request.signal abort → unsubscribeBoardClient 자동 실행
      es.close();
      setConnectionId(null);
      setUserCount(null);
    };
  }, [boardKey]);

  return { connectionId, userCount };
}
