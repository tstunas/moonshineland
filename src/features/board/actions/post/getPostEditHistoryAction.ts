"use server";

import prisma from "@/lib/prisma";

import type { BoardActionResult } from "../types";

interface PostEditHistoryItem {
  id: number;
  previousRawContent: string;
  previousContentType: string;
  previousCreatedAt: string;
  previousContentUpdatedAt: string | null;
  createdAt: string;
}

export interface PostEditHistoryActionResult extends BoardActionResult {
  histories?: PostEditHistoryItem[];
}

export async function getPostEditHistoryAction(
  formData: FormData,
): Promise<PostEditHistoryActionResult> {
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

  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      thread: {
        threadIndex,
        board: {
          boardKey,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!post) {
    return { success: false, message: "대상 레스를 찾지 못했습니다." };
  }

  const histories = await prisma.postContentHistory.findMany({
    where: {
      postId,
    },
    orderBy: {
      id: "desc",
    },
    select: {
      id: true,
      previousRawContent: true,
      previousContentType: true,
      previousCreatedAt: true,
      previousContentUpdatedAt: true,
      createdAt: true,
    },
  });

  return {
    success: true,
    message: "수정 이력을 불러왔습니다.",
    histories: histories.map((history) => ({
      id: history.id,
      previousRawContent: history.previousRawContent,
      previousContentType: history.previousContentType,
      previousCreatedAt: history.previousCreatedAt.toISOString(),
      previousContentUpdatedAt: history.previousContentUpdatedAt
        ? history.previousContentUpdatedAt.toISOString()
        : null,
      createdAt: history.createdAt.toISOString(),
    })),
  };
}
