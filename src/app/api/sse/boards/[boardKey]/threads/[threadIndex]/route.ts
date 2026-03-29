import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { verifyAccessToken } from "@/lib/jwt";
import {
  setReceiveNewPosts,
  subscribeThreadClient,
  unsubscribeThreadClient,
} from "@/lib/sse-store";
import type { PatchReceiveNewPostsRequest } from "@/types/sse";

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
  return `anon:${randomUUID()}`;
}

/**
 * GET /api/sse/boards/[boardKey]/threads/[threadIndex]
 *
 * 스레드 SSE 연결 수립.
 * 쿼리 파라미터:
 *   - receiveNewPosts=false  →  새 답글 수신 비활성화 (기본값: true)
 *
 * 수신 이벤트:
 *   - connected              →  { connectionId }
 *   - thread:user-count      →  { boardKey, threadIndex, count }
 *   - thread:new-post        →  Post (receiveNewPosts가 true인 경우만)
 *   - thread:post-content-edited       →  { postId, content, rawContent, isEdited, contentUpdatedAt, updatedAt }
 *   - thread:post-content-type-edited  →  { postId, contentType, updatedAt }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardKey: string; threadIndex: string }> },
) {
  const { boardKey, threadIndex: threadIndexStr } = await params;
  const threadIndex = Number(threadIndexStr);
  if (!Number.isInteger(threadIndex) || threadIndex <= 0) {
    return new Response("Invalid threadIndex", { status: 400 });
  }

  const connectionId = randomUUID();
  const clientKey = await resolveClientKey();

  // 쿼리 파라미터로 초기 새 답글 수신 여부 결정 (기본값 true)
  const receiveNewPosts =
    request.nextUrl.searchParams.get("receiveNewPosts") !== "false";

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const client = {
        connectionId,
        clientKey,
        controller,
        receiveNewPosts,
      };

      // connected 먼저 전송 → 이후 구독 + 사용자 수 수신
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ connectionId })}\n\n`,
        ),
      );

      subscribeThreadClient(boardKey, threadIndex, client);

      request.signal.addEventListener("abort", () => {
        unsubscribeThreadClient(boardKey, threadIndex, connectionId);
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

/**
 * PATCH /api/sse/boards/[boardKey]/threads/[threadIndex]
 *
 * 새 답글 수신 상태를 변경합니다.
 * Body: { connectionId: string, receiveNewPosts: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardKey: string; threadIndex: string }> },
) {
  const { boardKey, threadIndex: threadIndexStr } = await params;
  const threadIndex = Number(threadIndexStr);
  if (!Number.isInteger(threadIndex) || threadIndex <= 0) {
    return Response.json({ error: "Invalid threadIndex" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { connectionId, receiveNewPosts } = body as PatchReceiveNewPostsRequest;

  if (typeof connectionId !== "string" || typeof receiveNewPosts !== "boolean") {
    return Response.json(
      { error: "connectionId (string) and receiveNewPosts (boolean) are required" },
      { status: 400 },
    );
  }

  const updated = setReceiveNewPosts(
    boardKey,
    threadIndex,
    connectionId,
    receiveNewPosts,
  );

  if (!updated) {
    return Response.json({ error: "Connection not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
