"use server";

import {
  applyInlineImagePlaceholders,
  generateHtmlContent,
  parseContentType,
} from "@/features/board/actions/helpers";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

import { listAutoPostsByThreadId, resolveAutoPostOwnerContext } from "./helpers";
import type { AutoPostActionResult } from "./types";

export async function editAutoPostAction(
  formData: FormData,
): Promise<AutoPostActionResult> {
  const boardKey = String(formData.get("boardKey") ?? "").trim();
  const threadIndex = Number(formData.get("threadIndex") ?? 0);
  const autoPostId = Number(formData.get("autoPostId") ?? 0);
  const author = String(formData.get("author") ?? "").trim();
  const command = String(formData.get("command") ?? "").trim();
  const content = String(formData.get("content") ?? "");

  if (!boardKey || !Number.isInteger(threadIndex) || threadIndex <= 0) {
    return {
      success: false,
      message: "게시판 키 또는 스레드 번호가 올바르지 않습니다.",
    };
  }

  if (!Number.isInteger(autoPostId) || autoPostId <= 0) {
    return {
      success: false,
      message: "수정할 자동투하 레스 식별자가 올바르지 않습니다.",
    };
  }

  if (!content.trim()) {
    return {
      success: false,
      message: "내용은 필수입니다.",
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
  if (!checkRateLimit(context.userId, "edit-auto-post")) {
    return {
      success: false,
      message: "너무 빠른 요청입니다. 1초 이상 기다린 후 다시 시도해주세요.",
    };
  }

  const nextContentType = parseContentType(command) ?? "text";

  try {
    const autoPost = await prisma.autoPost.findFirst({
      where: {
        id: autoPostId,
        threadId: context.thread.id,
      },
      select: {
        id: true,
        contentType: true,
        isInlineImage: true,
        rawContent: true,
        author: true,
        autoPostImages: {
          select: {
            imageUrl: true,
            sortOrder: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!autoPost) {
      return {
        success: false,
        message: "수정할 자동투하 레스를 찾지 못했습니다.",
      };
    }

    const hasContentChanged = autoPost.rawContent !== content;
    const hasAuthorChanged = autoPost.author !== author;
    const hasContentTypeChanged = autoPost.contentType !== nextContentType;
    const inlineImageResult = applyInlineImagePlaceholders(
      generateHtmlContent(content, {
        off: command.split(".").includes("off"),
        location: { boardKey, threadIndex },
      }),
      autoPost.autoPostImages.map((image) => image.imageUrl),
    );
    const hasInlineImageChanged =
      autoPost.isInlineImage !== inlineImageResult.isInlineImage;

    await prisma.autoPost.update({
      where: {
        id: autoPost.id,
      },
      data: {
        author,
        contentType: nextContentType,
        rawContent: content,
        content: inlineImageResult.htmlContent,
        isInlineImage: inlineImageResult.isInlineImage,
        isEdited:
          hasContentChanged ||
          hasAuthorChanged ||
          hasContentTypeChanged ||
          hasInlineImageChanged,
        contentUpdatedAt: hasContentChanged ? new Date() : undefined,
      },
    });

    const autoPosts = await listAutoPostsByThreadId(context.thread.id);
    return {
      success: true,
      message: "자동투하 레스를 수정했습니다.",
      autoPosts,
    };
  } catch (error) {
    console.error("editAutoPostAction error", error);
    return {
      success: false,
      message: "자동투하 레스 수정에 실패했습니다.",
    };
  }
}
