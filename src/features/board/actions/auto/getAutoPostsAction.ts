"use server";

import { listAutoPostsByThreadId, resolveAutoPostOwnerContext } from "./helpers";
import type { AutoPostActionResult } from "./types";

export async function getAutoPostsAction(
  boardKey: string,
  threadIndex: number,
): Promise<AutoPostActionResult> {
  if (!boardKey || !Number.isInteger(threadIndex) || threadIndex <= 0) {
    return {
      success: false,
      message: "게시판 키 또는 스레드 번호가 올바르지 않습니다.",
    };
  }

  const context = await resolveAutoPostOwnerContext(boardKey, threadIndex);
  if ("error" in context) {
    return {
      success: false,
      message: context.error ?? "자동투하 권한 확인에 실패했습니다.",
    };
  }

  const autoPosts = await listAutoPostsByThreadId(context.thread.id);
  return {
    success: true,
    message: "자동투하 목록을 불러왔습니다.",
    autoPosts,
  };
}
