"use server";

import { getCurrentUser } from "@/features/auth/queries";
import prisma from "@/lib/prisma";

import {
  buildPostImagesCreateData,
  generateHtmlContent,
  parseContentType,
  uploadImages,
} from "../helpers";
import type { BoardActionResult } from "../types";

export async function createThreadAction(
  formData: FormData,
): Promise<BoardActionResult> {
  const boardKey = String(formData.get("boardKey") ?? "").trim();
  const threadIndex = Number(formData.get("threadIndex") ?? 0);
  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const command = String(formData.get("command") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  const isAdultOnly = formData.get("isAdultOnly") === "true";
  const isChat = formData.get("isChat") === "true";
  const imageFiles = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File);

  if (!boardKey || !Number.isInteger(threadIndex) || threadIndex <= 0) {
    return {
      success: false,
      message: "게시판 키 또는 스레드 번호가 올바르지 않습니다.",
    };
  }

  if (!title || !content.trim()) {
    return { success: false, message: "제목, 내용은 필수입니다." };
  }

  const contentType = parseContentType(command) ?? "text";

  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return { success: false, message: "로그인 후 작성할 수 있습니다." };
  }

  const board = await prisma.board.findUnique({
    where: {
      boardKey,
    },
    select: {
      id: true,
    },
  });

  if (!board) {
    return { success: false, message: "존재하지 않는 게시판입니다." };
  }

  const userId = Number(currentUser.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return { success: false, message: "유효하지 않은 사용자 정보입니다." };
  }

  try {
    const uploaded = await uploadImages(imageFiles, boardKey, threadIndex);
    const htmlContent = generateHtmlContent(content);

    await prisma.$transaction(async (tx) => {
      // TODO: 스레드 생성 전 도배 방지, 금칙어 검사, 권한 체크를 추가하세요.
      const thread = await tx.thread.create({
        data: {
          boardId: board.id,
          userId,
          threadIndex,
          title,
          author: author || "",
          idcode: "TODO-IDCODE",
          postCount: 0,
          isAdultOnly,
          isChat,
          postUpdatedAt: new Date(),
        },
      });

      // TODO: 이미지 다중 첨부 스키마(별도 테이블)로 확장하세요. 현재는 첫 번째 이미지만 저장합니다.
      await tx.post.create({
        data: {
          threadId: thread.id,
          userId,
          postOrder: 0,
          author: author || "",
          idcode: "TODO-IDCODE",
          content: htmlContent,
          rawContent: content,
          contentType,
          contentUpdatedAt: new Date(),
          ...(buildPostImagesCreateData(uploaded)
            ? { postImages: buildPostImagesCreateData(uploaded) }
            : {}),
        },
      });
    });

    return { success: true, message: "스레드가 작성되었습니다." };
  } catch (error) {
    console.error("createThreadAction error", error);
    return { success: false, message: "스레드 작성에 실패했습니다." };
  }
}
