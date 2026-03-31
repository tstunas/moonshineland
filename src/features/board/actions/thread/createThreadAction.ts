"use server";

import { getCurrentUser } from "@/features/auth/queries";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

import {
  applyInlineImagePlaceholders,
  buildPostImagesCreateData,
  generateHtmlContent,
  parseContentType,
  uploadImages,
} from "../helpers";
import type { BoardActionResult } from "../types";
import { createAuthorWithTripcode } from "../../lib/createAuthorWithTripcode";
import { createIdcode } from "../../lib/createIdcode";

const MAX_THREAD_INDEX_RETRY = 5;

function isThreadIndexConflictError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const withCode = error as { code?: unknown; meta?: { target?: unknown } };
  if (withCode.code !== "P2002") {
    return false;
  }

  const target = withCode.meta?.target;
  if (Array.isArray(target)) {
    const normalized = target
      .map((item) => String(item))
      .map((item) => item.toLowerCase());
    return normalized.includes("boardid") && normalized.includes("threadindex");
  }

  if (typeof target === "string") {
    const normalized = target.toLowerCase();
    return normalized.includes("boardid") && normalized.includes("threadindex");
  }

  return true;
}

export async function createThreadAction(
  formData: FormData,
): Promise<BoardActionResult> {
  const boardKey = String(formData.get("boardKey") ?? "").trim();
  const threadIndex = 0; // 스레드 번호는 자동으로 할당하므로 클라이언트에서 입력받지 않습니다.
  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const command = String(formData.get("command") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  const isAdultOnly = formData.get("isAdultOnly") === "true";
  const isChat = formData.get("isChat") === "true";
  const imageFiles = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File);

  if (!boardKey) {
    return {
      success: false,
      message: "게시판 키가 올바르지 않습니다.",
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

  const userId = Number(currentUser.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return { success: false, message: "유효하지 않은 사용자 정보입니다." };
  }

  // Rate Limit 검증: 1초 이내 중복 제출 방지
  if (!checkRateLimit(userId, "create-thread")) {
    return {
      success: false,
      message: "너무 빠른 요청입니다. 1초 이상 기다린 후 다시 시도해주세요.",
    };
  }

  const [board, user] = await Promise.all([
    prisma.board.findUnique({
      where: {
        boardKey,
      },
      select: {
        id: true,
      },
    }),
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        isAdultVerified: true,
      },
    }),
  ]);

  if (!board) {
    return { success: false, message: "존재하지 않는 게시판입니다." };
  }

  if (!user) {
    return { success: false, message: "유효하지 않은 사용자 정보입니다." };
  }

  if (isAdultOnly && !user.isAdultVerified) {
    return {
      success: false,
      message: "성인인증이 필요합니다.",
    };
  }

  try {
    let created = false;
    for (let attempt = 0; attempt < MAX_THREAD_INDEX_RETRY; attempt += 1) {
      try {
        await prisma.$transaction(async (tx) => {
          const lastThread = await tx.thread.findFirst({
            where: {
              boardId: board.id,
            },
            orderBy: {
              threadIndex: "desc",
            },
            select: {
              threadIndex: true,
            },
          });

          const nextThreadIndex = Math.max(
            threadIndex,
            (lastThread?.threadIndex ?? 0) + 1,
          );

          // TODO: 스레드 생성 전 도배 방지, 금칙어 검사, 권한 체크를 추가하세요.
          const thread = await tx.thread.create({
            data: {
              boardId: board.id,
              userId,
              threadIndex: nextThreadIndex,
              title,
              author: createAuthorWithTripcode(author),
              idcode: createIdcode(userId),
              postCount: 0,
              isAdultOnly,
              isChat,
              postUpdatedAt: new Date(),
            },
          });

          const uploaded = await uploadImages(
            imageFiles,
            boardKey,
            nextThreadIndex,
          );
          const htmlContent = generateHtmlContent(content, {
            off: command.split(".").includes("off"),
            location: { boardKey, threadIndex: nextThreadIndex },
          });
          const { htmlContent: nextHtmlContent, isInlineImage } =
            applyInlineImagePlaceholders(htmlContent, uploaded);

          // TODO: 이미지 다중 첨부 스키마(별도 테이블)로 확장하세요. 현재는 첫 번째 이미지만 저장합니다.
          await tx.post.create({
            data: {
              threadId: thread.id,
              userId,
              postOrder: 0,
              author: createAuthorWithTripcode(author),
              idcode: createIdcode(userId),
              content: nextHtmlContent,
              rawContent: content,
              contentType,
              isInlineImage,
              contentUpdatedAt: new Date(),
              ...(buildPostImagesCreateData(uploaded)
                ? { postImages: buildPostImagesCreateData(uploaded) }
                : {}),
            },
          });
        });

        created = true;
        break;
      } catch (error) {
        const canRetry =
          attempt < MAX_THREAD_INDEX_RETRY - 1 &&
          isThreadIndexConflictError(error);

        if (canRetry) {
          continue;
        }

        throw error;
      }
    }

    if (!created) {
      return {
        success: false,
        message: "동시 작성 충돌이 발생했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }

    return { success: true, message: "스레드가 작성되었습니다." };
  } catch (error) {
    console.error("createThreadAction error", error);
    return { success: false, message: "스레드 작성에 실패했습니다." };
  }
}
