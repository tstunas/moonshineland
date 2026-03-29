"use server";

import { broadcastPostVisibilityEdited } from "@/lib/sse-store";
import prisma from "@/lib/prisma";

import { resolveThreadManageContext } from "../helpers";
import type { BoardActionResult } from "../types";

export async function hidePostAction(
  formData: FormData,
): Promise<BoardActionResult> {
  const boardKey = String(formData.get("boardKey") ?? "").trim();
  const threadIndex = Number(formData.get("threadIndex") ?? 0);
  const postId = Number(formData.get("postId") ?? 0);

  if (
    !boardKey ||
    !Number.isInteger(threadIndex) ||
    threadIndex <= 0 ||
    !Number.isInteger(postId) ||
    postId <= 0
  ) {
    return {
      success: false,
      message: "게시판/스레드/레스 식별자가 올바르지 않습니다.",
    };
  }

  const context = await resolveThreadManageContext(boardKey, threadIndex);
  if ("error" in context) {
    return { success: false, message: context.error ?? "권한 확인에 실패했습니다." };
  }

  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      threadId: context.thread.id,
    },
    select: {
      id: true,
      isHidden: true,
    },
  });

  if (!post) {
    return { success: false, message: "대상 레스를 찾지 못했습니다." };
  }

  const updatedPost = await prisma.post.update({
    where: { id: post.id },
    data: { isHidden: !post.isHidden },
    select: {
      id: true,
      isHidden: true,
      updatedAt: true,
    },
  });

  broadcastPostVisibilityEdited(boardKey, threadIndex, {
    postId: updatedPost.id,
    isHidden: updatedPost.isHidden,
    updatedAt: updatedPost.updatedAt.toISOString(),
  });

  return {
    success: true,
    message: post.isHidden
      ? "레스 하이드를 해제했습니다."
      : "레스를 하이드했습니다.",
  };
}
