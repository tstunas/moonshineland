"use server";

import {
  applyInlineImagePlaceholders,
  generateHtmlContent,
  parseContentType,
  uploadImages,
} from "@/features/board/actions/helpers";
import prisma from "@/lib/prisma";

import { listAutoPostsByThreadId, resolveAutoPostOwnerContext } from "./helpers";
import type { AutoPostActionResult } from "./types";
import { createAuthorWithTripcode } from "../../lib/createAuthorWithTripcode";
import { createIdcode } from "../../lib/createIdcode";

const MAX_IMAGE_COUNT = 10;

export async function createAutoPostAction(
  formData: FormData,
): Promise<AutoPostActionResult> {
  const boardKey = String(formData.get("boardKey") ?? "").trim();
  const threadIndex = Number(formData.get("threadIndex") ?? 0);
  const author = String(formData.get("author") ?? "").trim();
  const command = String(formData.get("command") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  const imageFiles = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File);

  if (!boardKey || !Number.isInteger(threadIndex) || threadIndex <= 0) {
    return {
      success: false,
      message: "게시판 키 또는 스레드 번호가 올바르지 않습니다.",
    };
  }

  if (!content.trim()) {
    return {
      success: false,
      message: "내용은 필수입니다.",
    };
  }

  if (imageFiles.length > MAX_IMAGE_COUNT) {
    return {
      success: false,
      message: `이미지는 최대 ${MAX_IMAGE_COUNT}개까지 첨부할 수 있습니다.`,
    };
  }

  const context = await resolveAutoPostOwnerContext(boardKey, threadIndex);
  if ("error" in context) {
    return {
      success: false,
      message: context.error ?? "자동투하 권한 확인에 실패했습니다.",
    };
  }

  const commands = command.split(".");
  const off = commands.includes("off");

  const contentType = parseContentType(command) ?? "text";

  try {
    const uploaded = await uploadImages(imageFiles, boardKey, threadIndex);

    await prisma.$transaction(async (tx) => {
      const lastAutoPost = await tx.autoPost.findFirst({
        where: {
          threadId: context.thread.id,
        },
        orderBy: {
          autoPostSequence: "desc",
        },
        select: {
          autoPostSequence: true,
        },
      });

      const nextSequence = (lastAutoPost?.autoPostSequence ?? 0) + 1;
      const generatedContent = generateHtmlContent(content, {
        off,
        location: { boardKey, threadIndex },
      });
      const { htmlContent, isInlineImage } = applyInlineImagePlaceholders(
        generatedContent,
        uploaded,
      );

      await tx.autoPost.create({
        data: {
          threadId: context.thread.id,
          userId: context.userId,
          autoPostSequence: nextSequence,
          author: createAuthorWithTripcode(author),
          idcode: createIdcode(context.userId),
          rawContent: content,
          content: htmlContent,
          contentType,
          isInlineImage,
          contentUpdatedAt: new Date(),
          ...(uploaded.length > 0
            ? {
                autoPostImages: {
                  create: uploaded.map((imageUrl, index) => ({
                    imageUrl,
                    sortOrder: index + 1,
                  })),
                },
              }
            : {}),
        },
      });
    });

    const autoPosts = await listAutoPostsByThreadId(context.thread.id);
    return {
      success: true,
      message: "자동투하 레스를 작성했습니다.",
      autoPosts,
    };
  } catch (error) {
    console.error("createAutoPostAction error", error);
    return {
      success: false,
      message: "자동투하 레스 작성에 실패했습니다.",
    };
  }
}
