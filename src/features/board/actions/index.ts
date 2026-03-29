"use server";

export {
  adjustThreadPostLimitAction,
  createThreadAction,
  updateThreadSettingsAction,
} from "./thread";
export { createPostAction, editPostAction, getPostsAfterAction } from "./post";

export type { BoardActionResult, ThreadManageActionResult } from "./types";
