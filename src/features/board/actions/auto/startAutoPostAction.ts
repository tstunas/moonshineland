"use server";

import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

import {
  getAutoPostScheduleByThreadId,
  isValidAutoPostInterval,
  resolveAutoPostOwnerContext,
  upsertAutoPostScheduleByThreadId,
} from "./helpers";
import type { AutoPostActionResult } from "./types";

export async function startAutoPostAction(
  formData: FormData,
): Promise<AutoPostActionResult> {
  try {
    const boardKey = String(formData.get("boardKey") ?? "").trim();
    const threadIndex = Number(formData.get("threadIndex") ?? 0);
    const intervalSeconds = Number(formData.get("intervalSeconds") ?? 60);
    const orderMode =
      String(formData.get("orderMode") ?? "sequence").trim() === "random"
        ? "random"
        : "sequence";
    const stopWhenArchived =
      String(formData.get("stopWhenArchived") ?? "1") !== "0";

    if (!boardKey || !Number.isInteger(threadIndex) || threadIndex <= 0) {
      return {
        success: false,
        message: "게시판 키 또는 스레드 번호가 올바르지 않습니다.",
      };
    }

    if (!isValidAutoPostInterval(intervalSeconds)) {
      return {
        success: false,
        message: "자동투하 주기는 30/60/90/120/150/180초만 지원합니다.",
      };
    }

    const context = await resolveAutoPostOwnerContext(boardKey, threadIndex);
    if ("error" in context) {
      return {
        success: false,
        message: context.error ?? "자동투하 권한 확인에 실패했습니다.",
      };
    }

    // Rate Limit 검증: 1초 이내 중복 제출 방지
    if (!checkRateLimit(context.userId, "start-auto-post")) {
      return {
        success: false,
        message: "너무 빠른 요청입니다. 1초 이상 기다린 후 다시 시도해주세요.",
      };
    }

    const autoPostCount = await prisma.autoPost.count({
      where: {
        threadId: context.thread.id,
      },
    });

    if (autoPostCount <= 0) {
      return {
        success: false,
        message:
          "자동투하 템플릿(자동투하 레스)을 1개 이상 만들어야 시작할 수 있습니다.",
      };
    }

    await upsertAutoPostScheduleByThreadId({
      threadId: context.thread.id,
      userId: context.userId,
      intervalSeconds,
      orderMode,
      stopWhenArchived,
    });

    const now = new Date();
    const nextRunAt = new Date(now.getTime() + intervalSeconds * 1000);

    await prisma.autoPostSchedule.update({
      where: {
        threadId: context.thread.id,
      },
      data: {
        isEnabled: true,
        startedAt: now,
        stoppedAt: null,
        nextRunAt,
        lastError: null,
      },
    });

    const schedule = await getAutoPostScheduleByThreadId(context.thread.id);

    return {
      success: true,
      message: "자동투하를 시작했습니다.",
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
      message: "자동투하 시작 중 오류가 발생했습니다.",
    };
  }
}
