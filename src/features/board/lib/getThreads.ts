import { getThreadListQuery, type ThreadListFilters } from "@/features/board/queries";
import type { Thread } from "@/types/thread";

export type GetThreadsOptions = Omit<ThreadListFilters, "boardKey" | "pageSize">;

export async function getThreads(
  boardKey: string,
  options: GetThreadsOptions = {},
): Promise<Thread[]> {
  const result = await getThreadListQuery({
    boardKey,
    page: options.page,
    isChat: options.isChat,
    isAdultOnly: options.isAdultOnly,
    title: options.title,
    author: options.author,
    pageSize: 20,
  });

  return result.threads;
}
