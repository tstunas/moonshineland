"use server";

export {
  adjustThreadPostLimitAction,
  createThreadAction,
  updateThreadSettingsAction,
} from "./thread";
export { createPostAction, editPostAction, getPostsAfterAction } from "./post";
export {
  createAutoPostAction,
  editAutoPostAction,
  getAutoPostsAction,
  getAutoPostScheduleAction,
  saveAutoPostScheduleAction,
  startAutoPostAction,
  stopAutoPostAction,
} from "./auto";

export type { BoardActionResult, ThreadManageActionResult } from "./types";
