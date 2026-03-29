import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { verifyAccessToken } from "@/lib/jwt";
import {
  subscribeBoardClient,
  unsubscribeBoardClient,
} from "@/lib/sse-store";

export const dynamic = "force-dynamic";

async function resolveClientKey(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      return `user:${payload.sub}`;
    } catch {
      // 만료·변조 토큰 → 비로그인으로 처리
    }
  }
  // 비로그인: 연결 자체를 고유 식별자로 사용
  return `anon:${randomUUID()}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardKey: string }> },
) {
  const { boardKey } = await params;
  const connectionId = randomUUID();
  const clientKey = await resolveClientKey();

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const client = {
        connectionId,
        clientKey,
        controller,
        receiveNewPosts: false,
      };

      // connected 먼저 전송 → 이후 구독 + 사용자 수 수신
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ connectionId })}\n\n`,
        ),
      );

      subscribeBoardClient(boardKey, client);

      request.signal.addEventListener("abort", () => {
        unsubscribeBoardClient(boardKey, connectionId);
        try {
          controller.close();
        } catch {
          // 이미 닫힌 경우 무시
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
