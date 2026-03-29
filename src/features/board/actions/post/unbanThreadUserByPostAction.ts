"use server";

import prisma from "@/lib/prisma";

import { resolveThreadManageContext } from "../helpers";
import type { BoardActionResult } from "../types";

export async function unbanThreadUserByPostAction(
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
      userId: true,
    },
  });

  if (!post) {
    return { success: false, message: "대상 레스를 찾지 못했습니다." };
  }

  await prisma.threadBan.deleteMany({
    where: {
      threadId: context.thread.id,
      userId: post.userId,
    },
  });

  return { success: true, message: "해당 사용자의 밴을 해제했습니다." };
}
