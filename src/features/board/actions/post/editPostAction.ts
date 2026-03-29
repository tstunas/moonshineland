"use server";

import { getCurrentUser } from "@/features/auth/queries";
import {
  broadcastPostContentEdited,
  broadcastPostContentTypeEdited,
} from "@/lib/sse-store";
import prisma from "@/lib/prisma";

import {
  applyInlineImagePlaceholders,
  generateHtmlContent,
  parseContentType,
} from "../helpers";
import type { BoardActionResult } from "../types";

export async function editPostAction(
  formData: FormData,
): Promise<BoardActionResult> {
  const boardKey = String(formData.get("boardKey") ?? "").trim();
  const threadIndex = Number(formData.get("threadIndex") ?? 0);
  const postIdValue = formData.get("postId");
  const postOrderValue = formData.get("postOrder");
  const command = String(formData.get("command") ?? "").trim();
  const content = String(formData.get("content") ?? "");

  if (!boardKey || !Number.isInteger(threadIndex) || threadIndex <= 0) {
    return {
      success: false,
      message: "게시판 키 또는 스레드 번호가 올바르지 않습니다.",
    };
  }

  const postId = postIdValue ? Number(postIdValue) : null;
  const postOrder = postOrderValue ? Number(postOrderValue) : null;

  if (
    (postId === null || !Number.isInteger(postId) || postId <= 0) &&
    (postOrder === null || !Number.isInteger(postOrder) || postOrder < 0)
  ) {
    return {
      success: false,
      message: "수정할 레스 식별자(postId 또는 postOrder)가 필요합니다.",
    };
  }

  const nextContentType = parseContentType(command);
  const hasContent = content.length > 0;

  if (!hasContent && !nextContentType) {
    return {
      success: false,
      message:
        "content 또는 유효한 command(text, aa, novel, line) 중 하나는 필요합니다.",
    };
  }

  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return { success: false, message: "로그인 후 수정할 수 있습니다." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const post = await tx.post.findFirst({
        where: {
          ...(postId ? { id: postId } : {}),
          ...(postOrder !== null ? { postOrder } : {}),
          thread: {
            threadIndex,
            board: {
              boardKey,
            },
          },
        },
        include: {
          postImages: {
            select: {
              imageUrl: true,
              sortOrder: true,
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
          thread: {
            select: {
              id: true,
              threadIndex: true,
              board: {
                select: {
                  boardKey: true,
                },
              },
            },
          },
        },
      });

      if (!post) {
        throw new Error("POST_NOT_FOUND");
      }

      const nextRawContent = hasContent ? content : post.rawContent;
      const inlineImageResult = hasContent
        ? applyInlineImagePlaceholders(
            generateHtmlContent(nextRawContent, {
              off: command.split(".").includes("off"),
              location: { boardKey, threadIndex },
            }),
            post.postImages.map((image) => image.imageUrl),
          )
        : null;
      const nextHtmlContent = inlineImageResult?.htmlContent ?? post.content;
      const nextIsInlineImage = inlineImageResult?.isInlineImage ?? post.isInlineImage;

      if (hasContent) {
        await tx.postContentHistory.create({
          data: {
            postId: post.id,
            previousContent: post.content,
            previousRawContent: post.rawContent,
            previousContentType: post.contentType,
            previousCreatedAt: post.createdAt,
            previousContentUpdatedAt: post.contentUpdatedAt,
          },
        });
      }

      const updatedPost = await tx.post.update({
        where: {
          id: post.id,
        },
        data: {
          ...(nextContentType ? { contentType: nextContentType } : {}),
          ...(hasContent
            ? {
                content: nextHtmlContent,
                rawContent: nextRawContent,
                isInlineImage: nextIsInlineImage,
                isEdited: true,
                contentUpdatedAt: new Date(),
              }
            : {}),
        },
      });

      await tx.thread.update({
        where: {
          id: post.thread.id,
        },
        data: {
          postUpdatedAt: updatedPost.updatedAt,
        },
      });

      if (hasContent) {
        broadcastPostContentEdited(
          post.thread.board.boardKey,
          post.thread.threadIndex,
          {
            postId: updatedPost.id,
            content: updatedPost.content,
            rawContent: updatedPost.rawContent,
            isInlineImage: updatedPost.isInlineImage,
            isEdited: updatedPost.isEdited,
            contentUpdatedAt:
              updatedPost.contentUpdatedAt?.toISOString() ??
              new Date().toISOString(),
            updatedAt: updatedPost.updatedAt.toISOString(),
          },
        );
      }

      if (nextContentType) {
        broadcastPostContentTypeEdited(
          post.thread.board.boardKey,
          post.thread.threadIndex,
          {
            postId: updatedPost.id,
            contentType: updatedPost.contentType,
            updatedAt: updatedPost.updatedAt.toISOString(),
          },
        );
      }
    });

    return { success: true, message: "레스이 수정되었습니다." };
  } catch (error) {
    if (error instanceof Error && error.message === "POST_NOT_FOUND") {
      return { success: false, message: "수정할 레스을 찾지 못했습니다." };
    }

    console.error("editPostAction error", error);
    return { success: false, message: "레스 수정에 실패했습니다." };
  }
}
