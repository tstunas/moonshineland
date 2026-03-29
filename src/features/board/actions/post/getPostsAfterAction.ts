"use server";

import { getPostsAfterOrderQuery } from "@/features/board/queries";
import type { PostWithImages } from "@/types/post";

export async function getPostsAfterAction(
  boardKey: string,
  threadIndex: number,
  lastPostOrder: number,
): Promise<PostWithImages[]> {
  if (!boardKey || !Number.isInteger(threadIndex) || threadIndex <= 0) {
    return [];
  }

  if (!Number.isFinite(lastPostOrder)) {
    return [];
  }

  return getPostsAfterOrderQuery(boardKey, threadIndex, lastPostOrder);
}
