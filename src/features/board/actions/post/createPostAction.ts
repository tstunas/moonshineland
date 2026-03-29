"use server";

import { getCurrentUser } from "@/features/auth/queries";
import { broadcastNewPost } from "@/lib/sse-store";
import prisma from "@/lib/prisma";
import type { Post } from "@/types/post";

import {
  buildPostImagesCreateData,
  generateHtmlContent,
  parseContentType,
  uploadImages,
} from "../helpers";
import type { BoardActionResult } from "../types";

export async function createPostAction(
  formData: FormData,
): Promise<BoardActionResult> {
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
    return { success: false, message: "내용은 필수입니다." };
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

  try {
    const uploaded = await uploadImages(imageFiles, boardKey, threadIndex);
    const createdPostForBroadcast: Post = await prisma.$transaction(
      async (tx) => {
        const thread = await tx.thread.findFirst({
          where: {
            threadIndex,
            board: {
              boardKey,
            },
          },
          select: {
            id: true,
            userId: true,
            postLimit: true,
            postCount: true,
            isPrivate: true,
          },
        });

        if (!thread) {
          throw new Error("THREAD_NOT_FOUND");
        }

        // TODO: 동시성 경쟁이 있을 수 있으므로 락/재시도 전략을 추가하세요.
        const lastPost = await tx.post.findFirst({
          where: {
            threadId: thread.id,
          },
          orderBy: {
            postOrder: "desc",
          },
          select: {
            postOrder: true,
          },
        });

        const nextPostOrder = (lastPost?.postOrder ?? -1) + 1;

        if (thread.isPrivate && thread.userId !== userId) {
          throw new Error("THREAD_REPLY_LOCKED");
        }

        if (nextPostOrder > thread.postLimit) {
          throw new Error("POST_LIMIT_EXCEEDED");
        }

        const htmlContent = generateHtmlContent(content);

        const createdPost = await tx.post.create({
          data: {
            threadId: thread.id,
            userId,
            postOrder: nextPostOrder,
            author,
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

        await tx.thread.update({
          where: {
            id: thread.id,
          },
          data: {
            postCount: createdPost.postOrder,
            postUpdatedAt: createdPost.createdAt,
          },
        });

        return createdPost;
      },
    );
    broadcastNewPost(boardKey, threadIndex, createdPostForBroadcast);

    return { success: true, message: "레스이 작성되었습니다." };
  } catch (error) {
    if (error instanceof Error && error.message === "THREAD_NOT_FOUND") {
      return { success: false, message: "존재하지 않는 스레드입니다." };
    }

    if (error instanceof Error && error.message === "POST_LIMIT_EXCEEDED") {
      return {
        success: false,
        message: "스레드 작성 제한을 초과하여 레스을 작성할 수 없습니다.",
      };
    }

    if (error instanceof Error && error.message === "THREAD_REPLY_LOCKED") {
      return {
        success: false,
        message: "현재 스레드 설정으로 인해 레스을 작성할 수 없습니다.",
      };
    }

    console.error("createPostAction error", error);
    return { success: false, message: "레스 작성에 실패했습니다." };
  }
}
