import { getThreadQuery } from "@/features/board/queries";
import type { Thread } from "@/types/thread";

export async function getThread(
  boardKey: string,
  threadIndex: number,
): Promise<Thread | null> {
  return getThreadQuery(boardKey, threadIndex);
}
