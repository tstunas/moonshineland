"use server";

import prisma from "@/lib/prisma";

import { resolveThreadManageContext } from "../helpers";
import type { BoardActionResult } from "../types";

interface BanThreadUserByPostActionResult extends BoardActionResult {
  alreadyBanned?: boolean;
}

export async function banThreadUserByPostAction(
  formData: FormData,
): Promise<BanThreadUserByPostActionResult> {
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

  if (post.userId === null) {
    return { success: false, message: "탈퇴한 유저는 밴할 수 없습니다." };
  }

  const existing = await prisma.threadBan.findUnique({
    where: {
      threadId_userId: {
        threadId: context.thread.id,
        userId: post.userId,
      },
    },
  });

  if (existing) {
    return {
      success: true,
      message: "이미 밴된 사용자입니다.",
      alreadyBanned: true,
    };
  }

  await prisma.threadBan.create({
    data: {
      threadId: context.thread.id,
      userId: post.userId,
    },
  });

  return {
    success: true,
    message: "해당 사용자를 스레드에서 밴했습니다.",
    alreadyBanned: false,
  };
}
