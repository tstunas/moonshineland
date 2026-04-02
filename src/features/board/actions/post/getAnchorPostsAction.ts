"use server";

import { getPostListQuery } from "@/features/board/queries";
import type { PostWithImages } from "@/types/post";

const MAX_RANGE_SIZE = 200;

export async function getAnchorPostsAction(
  boardKey: string,
  threadIndex: number,
  start: number,
  end?: number,
): Promise<PostWithImages[]> {
  if (!boardKey || !Number.isInteger(threadIndex) || threadIndex <= 0) {
    return [];
  }

  if (!Number.isInteger(start) || start <= 0) {
    return [];
  }

  const safeEnd = Number.isInteger(end) && (end ?? 0) > 0 ? end! : start;
  const minOrder = Math.min(start, safeEnd);
  const maxOrder = Math.max(start, safeEnd);

  if (maxOrder - minOrder + 1 > MAX_RANGE_SIZE) {
    return [];
  }

  return getPostListQuery({
    boardKey,
    threadIndex,
    mode: "range",
    start: minOrder,
    end: maxOrder,
    includeZero: false,
  });
}