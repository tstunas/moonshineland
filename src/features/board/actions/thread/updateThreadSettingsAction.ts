"use server";

import bcrypt from "bcrypt";

import prisma from "@/lib/prisma";

import {
  parseBooleanFormValue,
  resolveThreadManageContext,
} from "../helpers";
import type { ThreadManageActionResult } from "../types";

export async function updateThreadSettingsAction(
  formData: FormData,
): Promise<ThreadManageActionResult> {
  const boardKey = String(formData.get("boardKey") ?? "").trim();
  const threadIndex = Number(formData.get("threadIndex") ?? 0);
  const title = String(formData.get("title") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const clearPassword = parseBooleanFormValue(formData.get("clearPassword"));
  const isHidden = parseBooleanFormValue(formData.get("isHidden"));
  const isSecret = parseBooleanFormValue(formData.get("isSecret"));
  const allowOthersReply = parseBooleanFormValue(
    formData.get("allowOthersReply"),
  );

  if (!boardKey || !Number.isInteger(threadIndex) || threadIndex <= 0) {
    return {
      success: false,
      message: "게시판 키 또는 스레드 번호가 올바르지 않습니다.",
    };
  }

  if (!title) {
    return {
      success: false,
      message: "스레드 제목은 비워둘 수 없습니다.",
    };
  }

  const context = await resolveThreadManageContext(boardKey, threadIndex);
  if ("error" in context) {
    return { success: false, message: context.error ?? "권한 확인에 실패했습니다." };
  }

  let passwordHashUpdate: string | null | undefined;
  if (clearPassword) {
    passwordHashUpdate = null;
  } else if (password) {
    passwordHashUpdate = await bcrypt.hash(password, 10);
  }

  const updated = await prisma.thread.update({
    where: {
      id: context.thread.id,
    },
    data: {
      title,
      isHidden,
      isSecret,
      // 레스 허용 여부는 isPrivate 반전값으로 저장합니다.
      isPrivate: !allowOthersReply,
      ...(passwordHashUpdate !== undefined
        ? { passwordHash: passwordHashUpdate }
        : {}),
      postUpdatedAt: new Date(),
    },
    select: {
      title: true,
      isHidden: true,
      isSecret: true,
      isPrivate: true,
    },
  });

  return {
    success: true,
    message: "스레드 정보를 수정했습니다.",
    thread: {
      title: updated.title,
      isHidden: updated.isHidden,
      isSecret: updated.isSecret,
      allowOthersReply: !updated.isPrivate,
    },
  };
}
