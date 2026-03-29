import {
  getThreadListQuery,
  type ThreadListFilters,
} from "@/features/board/queries";

export type GetTotalThreadsOptions = Omit<
  ThreadListFilters,
  "boardKey" | "page" | "pageSize"
>;

export async function getTotalThreads(
  boardKey: string,
  options: GetTotalThreadsOptions = {},
): Promise<number> {
  const result = await getThreadListQuery({
    boardKey,
    page: 1,
    pageSize: 1,
    isChat: options.isChat,
    isAdultOnly: options.isAdultOnly,
    title: options.title,
    author: options.author,
  });

  return result.total;
}