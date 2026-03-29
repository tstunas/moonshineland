"use server";

import { getArchiveStorage } from "@/features/archive/storage/archiveStorage";

export interface ArchiveHtmlResult {
  success: boolean;
  html: string;
  message?: string;
}

export async function getArchiveHtmlAction(
  archiveKey: string,
): Promise<ArchiveHtmlResult> {
  const normalizedKey = archiveKey.trim();
  if (!normalizedKey) {
    return {
      success: false,
      html: "",
      message: "아카이브 키가 비어 있습니다.",
    };
  }

  const storage = getArchiveStorage();
  const html = await storage.readArchiveHtml(normalizedKey);

  if (!html) {
    return {
      success: false,
      html: "",
      message: "아카이브 HTML을 찾을 수 없습니다.",
    };
  }

  return {
    success: true,
    html,
  };
}