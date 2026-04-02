"use server";

import { randomUUID } from "crypto";
import path from "path";

import { getAdminUserId } from "@/features/admin/access";
import { recordAdminAudit } from "@/features/admin/audit";
import {
  applyInlineImagePlaceholders,
  generateHtmlContent,
  parseContentType,
  parseBooleanFormValue,
} from "@/features/board/actions/helpers";
import { uploadImageToS3 } from "@/lib/s3";
import prisma from "@/lib/prisma";

const MAX_IMAGE_COUNT = 10;

interface AnnouncementActionResult {
  success: boolean;
  message: string;
  announcementId?: number;
}

function getImageFiles(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function normalizeTextFormValue(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function uploadAnnouncementImages(files: File[]): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = path.extname(safeName) || ".bin";
    const fileName = `${Date.now()}-${randomUUID()}${ext}`;
    const destPath = `announcements/${fileName}`;
    const url = await uploadImageToS3(file, destPath);
    urls.push(url);
  }

  return urls;
}

export async function createAnnouncementAction(
  formData: FormData,
): Promise<AnnouncementActionResult> {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    return { success: false, message: "관리자 권한이 필요합니다." };
  }

  const title = normalizeTextFormValue(formData, "title");
  const command = normalizeTextFormValue(formData, "command");
  const rawContent = String(formData.get("content") ?? "");
  const isAdultOnly = parseBooleanFormValue(formData.get("isAdultOnly"));
  const imageFiles = getImageFiles(formData);

  if (!title || !rawContent.trim()) {
    return { success: false, message: "제목과 내용은 필수입니다." };
  }

  if (imageFiles.length > MAX_IMAGE_COUNT) {
    return {
      success: false,
      message: `이미지는 최대 ${MAX_IMAGE_COUNT}개까지 첨부할 수 있습니다.`,
    };
  }

  const contentType = parseContentType(command) ?? "text";
  const isOffCommand = command.split(".").includes("off");

  try {
    const uploadedImageUrls = await uploadAnnouncementImages(imageFiles);
    const htmlContent = generateHtmlContent(rawContent, {
      off: isOffCommand,
    });
    const { htmlContent: nextHtmlContent, isInlineImage } =
      applyInlineImagePlaceholders(htmlContent, uploadedImageUrls);

    const created = await prisma.announcement.create({
      data: {
        title,
        content: nextHtmlContent,
        rawContent,
        contentType,
        isAdultOnly,
        isInlineImage,
        contentUpdatedAt: new Date(),
        userId: adminUserId,
        ...(uploadedImageUrls.length > 0
          ? {
              announcementImages: {
                create: uploadedImageUrls.map((imageUrl, index) => ({
                  imageUrl,
                  sortOrder: index + 1,
                })),
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    await recordAdminAudit({
      adminUserId,
      action: "announcement.create",
      targetType: "announcement",
      targetIds: [created.id],
      summary: `공지사항 생성: ${title}`,
      details: {
        isAdultOnly,
        imageCount: uploadedImageUrls.length,
      },
    });

    return {
      success: true,
      message: "공지사항을 작성했습니다.",
      announcementId: created.id,
    };
  } catch (error) {
    console.error("createAnnouncementAction error", error);
    return { success: false, message: "공지사항 작성에 실패했습니다." };
  }
}

export async function updateAnnouncementAction(
  formData: FormData,
): Promise<AnnouncementActionResult> {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    return { success: false, message: "관리자 권한이 필요합니다." };
  }

  const announcementId = Number(formData.get("announcementId") ?? 0);
  if (!Number.isInteger(announcementId) || announcementId <= 0) {
    return { success: false, message: "유효하지 않은 공지 ID입니다." };
  }

  const title = normalizeTextFormValue(formData, "title");
  const command = normalizeTextFormValue(formData, "command");
  const rawContent = String(formData.get("content") ?? "");
  const isAdultOnly = parseBooleanFormValue(formData.get("isAdultOnly"));
  const isHidden = parseBooleanFormValue(formData.get("isHidden"));
  const imageFiles = getImageFiles(formData);

  if (!title || !rawContent.trim()) {
    return { success: false, message: "제목과 내용은 필수입니다." };
  }

  if (imageFiles.length > MAX_IMAGE_COUNT) {
    return {
      success: false,
      message: `이미지는 최대 ${MAX_IMAGE_COUNT}개까지 첨부할 수 있습니다.`,
    };
  }

  const existing = await prisma.announcement.findUnique({
    where: {
      id: announcementId,
    },
    include: {
      announcementImages: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!existing) {
    return { success: false, message: "공지사항을 찾을 수 없습니다." };
  }

  const contentType = parseContentType(command) ?? "text";
  const isOffCommand = command.split(".").includes("off");

  try {
    const uploadedImageUrls =
      imageFiles.length > 0
        ? await uploadAnnouncementImages(imageFiles)
        : existing.announcementImages.map((image) => image.imageUrl);

    const htmlContent = generateHtmlContent(rawContent, {
      off: isOffCommand,
    });
    const { htmlContent: nextHtmlContent, isInlineImage } =
      applyInlineImagePlaceholders(htmlContent, uploadedImageUrls);

    await prisma.$transaction(async (tx) => {
      await tx.announcementContentHistory.create({
        data: {
          announcementId: existing.id,
          previousTitle: existing.title,
          previousContent: existing.content,
          previousRawContent: existing.rawContent,
          previousContentType: existing.contentType,
          previousCreatedAt: existing.createdAt,
          previousContentUpdatedAt: existing.contentUpdatedAt,
        },
      });

      await tx.announcement.update({
        where: {
          id: existing.id,
        },
        data: {
          title,
          content: nextHtmlContent,
          rawContent,
          contentType,
          isAdultOnly,
          isHidden,
          isInlineImage,
          isEdited: true,
          contentUpdatedAt: new Date(),
          ...(imageFiles.length > 0
            ? {
                announcementImages: {
                  deleteMany: {},
                  create: uploadedImageUrls.map((imageUrl, index) => ({
                    imageUrl,
                    sortOrder: index + 1,
                  })),
                },
              }
            : {}),
        },
      });
    });

    await recordAdminAudit({
      adminUserId,
      action: "announcement.update",
      targetType: "announcement",
      targetIds: [existing.id],
      summary: `공지사항 수정: ${title}`,
      details: {
        isAdultOnly,
        isHidden,
        replacedImages: imageFiles.length > 0,
      },
    });

    return {
      success: true,
      message: "공지사항을 수정했습니다.",
      announcementId: existing.id,
    };
  } catch (error) {
    console.error("updateAnnouncementAction error", error);
    return { success: false, message: "공지사항 수정에 실패했습니다." };
  }
}
