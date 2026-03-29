"use server";

import prisma from "@/lib/prisma";

import { resolveThreadManageContext } from "../helpers";
import type { ThreadManageActionResult } from "../types";

export async function adjustThreadPostLimitAction(
  formData: FormData,
): Promise<ThreadManageActionResult> {
  const boardKey = String(formData.get("boardKey") ?? "").trim();
  const threadIndex = Number(formData.get("threadIndex") ?? 0);
  const delta = Number(formData.get("delta") ?? 0);

  if (!boardKey || !Number.isInteger(threadIndex) || threadIndex <= 0) {
    return {
      success: false,
      message: "게시판 키 또는 스레드 번호가 올바르지 않습니다.",
    };
  }

  if (!Number.isInteger(delta) || Math.abs(delta) !== 1000) {
    return {
      success: false,
      message: "postLimit 조정값은 1000 또는 -1000만 가능합니다.",
    };
  }

  const context = await resolveThreadManageContext(boardKey, threadIndex);
  if ("error" in context) {
    return { success: false, message: context.error ?? "권한 확인에 실패했습니다." };
  }

  const nextPostLimit = context.thread.postLimit + delta;
  if (nextPostLimit < 1 || nextPostLimit > 5001) {
    return {
      success: false,
      message: "스레드 상한은 1 이상 5001 이하만 허용됩니다.",
    };
  }

  const updated = await prisma.thread.update({
    where: {
      id: context.thread.id,
    },
    data: {
      postLimit: nextPostLimit,
      postUpdatedAt: new Date(),
    },
    select: {
      postLimit: true,
    },
  });

  return {
    success: true,
    message: `스레드 상한을 ${updated.postLimit}으로 변경했습니다.`,
    postLimit: updated.postLimit,
  };
}
