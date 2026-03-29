"use server";

import {
  getAutoPostScheduleByThreadId,
  resolveAutoPostOwnerContext,
} from "./helpers";
import type { AutoPostActionResult } from "./types";

export async function getAutoPostScheduleAction(
  boardKey: string,
  threadIndex: number,
): Promise<AutoPostActionResult> {
  try {
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

    const schedule = await getAutoPostScheduleByThreadId(context.thread.id);
    return {
      success: true,
      message: "자동투하 스케줄을 불러왔습니다.",
      schedule,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "AUTO_POST_SCHEDULE_MODEL_NOT_READY"
    ) {
      return {
        success: false,
        message:
          "자동투하 스케줄 모델이 아직 준비되지 않았습니다. 개발 서버를 재시작한 뒤 다시 시도해주세요.",
      };
    }

    return {
      success: false,
      message: "자동투하 스케줄 조회 중 오류가 발생했습니다.",
    };
  }
}
