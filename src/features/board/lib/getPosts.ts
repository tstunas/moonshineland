import {
  getPostListQuery,
  type PostListMode,
} from "@/features/board/queries";
import type { Post } from "@/types/post";

export interface GetPostsOptions {
  mode?: PostListMode;
  start?: number;
  end?: number;
  includeZero?: boolean;
}

export async function getPosts(
  boardKey: string,
  threadIndex: number,
  options: GetPostsOptions = {},
): Promise<Post[]> {
  return getPostListQuery({
    boardKey,
    threadIndex,
    mode: options.mode,
    start: options.start,
    end: options.end,
    includeZero: options.includeZero,
  });
}
