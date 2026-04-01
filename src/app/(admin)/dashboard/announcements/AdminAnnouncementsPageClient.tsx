"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createAnnouncementAction,
  updateAnnouncementAction,
} from "@/features/announcement/actions/manageAnnouncementAction";
import type { AnnouncementWithRelations } from "@/features/announcement/queries";
import { PostImagePicker } from "@/features/board/components/PostImagePicker";
import { PreviewModal } from "@/features/board/components/PreviewModal";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

const MAX_IMAGE_COUNT = 10;
const CONTENT_TYPE_DEBOUNCE_MS = 300;

type ParsedContentType = "text" | "aa" | "novel" | "line";

function parseContentType(command: string): ParsedContentType {
  const normalized = command.trim().toLowerCase();
  const splitted = normalized.split(".");
  if (splitted.includes("aa")) return "aa";
  if (splitted.includes("novel")) return "novel";
  if (splitted.includes("line")) return "line";

  return "text";
}

function getDefaultCommandByContentType(contentType: string): string {
  if (contentType === "aa" || contentType === "novel" || contentType === "line") {
    return contentType;
  }

  return "";
}

interface AdminAnnouncementsPageClientProps {
  initialAnnouncements: AnnouncementWithRelations[];
}

export default function AdminAnnouncementsPageClient({
  initialAnnouncements,
}: AdminAnnouncementsPageClientProps) {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputId = "admin-announcement-image";

  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [command, setCommand] = useState("");
  const [content, setContent] = useState("");
  const [isAdultOnly, setIsAdultOnly] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [contentTypeClassName, setContentTypeClassName] =
    useState<ParsedContentType>("text");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setContentTypeClassName(parseContentType(command));
    }, CONTENT_TYPE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [command]);

  const editingAnnouncement = useMemo(
    () =>
      editingId
        ? initialAnnouncements.find((announcement) => announcement.id === editingId) ?? null
        : null,
    [editingId, initialAnnouncements],
  );

  const syncSelectedImages = useCallback((files: File[]) => {
    const input = imageInputRef.current;
    if (input) {
      const dataTransfer = new DataTransfer();
      for (const file of files) {
        dataTransfer.items.add(file);
      }
      input.files = dataTransfer.files;
    }
    setSelectedImages(files);
  }, []);

  const applyImageLimit = useCallback(
    (files: FileList | null) => {
      const allFiles = files ? Array.from(files) : [];
      if (allFiles.length <= MAX_IMAGE_COUNT) {
        syncSelectedImages(allFiles);
        return;
      }

      toast.error(`이미지는 최대 ${MAX_IMAGE_COUNT}개까지 첨부할 수 있습니다.`);
      syncSelectedImages(allFiles.slice(0, MAX_IMAGE_COUNT));
    },
    [syncSelectedImages],
  );

  const clearSelectedImages = useCallback(() => {
    syncSelectedImages([]);
  }, [syncSelectedImages]);

  const removeSelectedImage = useCallback(
    (indexToRemove: number) => {
      const nextFiles = selectedImages.filter((_, index) => index !== indexToRemove);
      syncSelectedImages(nextFiles);
    },
    [selectedImages, syncSelectedImages],
  );

  const moveSelectedImage = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= selectedImages.length ||
        toIndex >= selectedImages.length
      ) {
        return;
      }

      const nextFiles = [...selectedImages];
      const [moved] = nextFiles.splice(fromIndex, 1);
      nextFiles.splice(toIndex, 0, moved);
      syncSelectedImages(nextFiles);
    },
    [selectedImages, syncSelectedImages],
  );

  const resetForm = useCallback(() => {
    setEditingId(null);
    setTitle("");
    setCommand("");
    setContent("");
    setIsAdultOnly(false);
    setIsHidden(false);
    clearSelectedImages();
  }, [clearSelectedImages]);

  const applyAnnouncementToForm = useCallback(
    (announcement: AnnouncementWithRelations) => {
      setEditingId(announcement.id);
      setTitle(announcement.title);
      setCommand(getDefaultCommandByContentType(announcement.contentType));
      setContent(announcement.rawContent);
      setIsAdultOnly(announcement.isAdultOnly);
      setIsHidden(announcement.isHidden);
      clearSelectedImages();
    },
    [clearSelectedImages],
  );

  const submitForm = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("제목과 내용을 입력해주세요.");
      return;
    }

    setIsPending(true);

    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("command", command);
      formData.set("content", content);
      if (isAdultOnly) {
        formData.set("isAdultOnly", "true");
      }
      if (isHidden) {
        formData.set("isHidden", "true");
      }
      for (const file of selectedImages) {
        formData.append("images", file);
      }

      const result = editingId
        ? await updateAnnouncementAction(formDataWithId(formData, editingId))
        : await createAnnouncementAction(formData);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();

      if (!editingId) {
        resetForm();
      }
    } catch (error) {
      console.error(error);
      toast.error("공지사항 저장 중 오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  }, [
    command,
    content,
    editingId,
    isAdultOnly,
    isHidden,
    resetForm,
    router,
    selectedImages,
    title,
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Admin Notice
            </p>
            <h1 className="text-2xl font-black text-slate-900">공지사항 관리</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              새 공지 작성 모드
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label
            className={cn(
              "cursor-pointer rounded-xl border px-3 py-2.5 transition",
              isAdultOnly
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50/50",
            )}
          >
            <input
              type="checkbox"
              checked={isAdultOnly}
              onChange={(event) => {
                setIsAdultOnly(event.target.checked);
              }}
              className="sr-only"
            />
            <span className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-semibold">성인만 공지</span>
                <span className="mt-0.5 block text-xs opacity-80">
                  성인 인증 사용자만 공지를 볼 수 있습니다.
                </span>
              </span>
              <span
                className={cn(
                  "inline-flex h-6 w-11 rounded-full p-0.5 transition",
                  isAdultOnly ? "bg-rose-400" : "bg-slate-300",
                )}
              >
                <span
                  className={cn(
                    "h-5 w-5 rounded-full bg-white shadow-sm transition",
                    isAdultOnly ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </span>
            </span>
          </label>

          <label
            className={cn(
              "cursor-pointer rounded-xl border px-3 py-2.5 transition",
              isHidden
                ? "border-slate-400 bg-slate-200 text-slate-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100",
            )}
          >
            <input
              type="checkbox"
              checked={isHidden}
              onChange={(event) => {
                setIsHidden(event.target.checked);
              }}
              className="sr-only"
            />
            <span className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-semibold">숨김 공지</span>
                <span className="mt-0.5 block text-xs opacity-80">
                  숨김 처리하면 일반 사용자에게 노출되지 않습니다.
                </span>
              </span>
              <span
                className={cn(
                  "inline-flex h-6 w-11 rounded-full p-0.5 transition",
                  isHidden ? "bg-slate-500" : "bg-slate-300",
                )}
              >
                <span
                  className={cn(
                    "h-5 w-5 rounded-full bg-white shadow-sm transition",
                    isHidden ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </span>
            </span>
          </label>
        </div>

        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            placeholder="제목(80자 이내)"
            className="h-10 w-full rounded border border-sky-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
          />
          <input
            type="text"
            value={command}
            onChange={(event) => {
              setCommand(event.target.value);
            }}
            placeholder="콘솔 명령어(aa / novel / line)"
            className="h-10 w-full rounded border border-sky-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
          />
          <textarea
            value={content}
            rows={8}
            onChange={(event) => {
              setContent(event.target.value);
            }}
            placeholder="내용(4만자 이내)"
            className={cn(
              "contentInput w-full resize-y rounded border border-sky-200 bg-slate-50 px-3 py-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none",
              contentTypeClassName,
            )}
          />
        </div>

        <PostImagePicker
          imageInputRef={imageInputRef}
          imageInputId={imageInputId}
          selectedImages={selectedImages}
          onImageChange={applyImageLimit}
          onClearSelectedImages={clearSelectedImages}
          onRemoveSelectedImage={removeSelectedImage}
          onMoveSelectedImage={moveSelectedImage}
        />

        {editingAnnouncement ? (
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            현재 수정 중: #{editingAnnouncement.id} / 기존 이미지 {editingAnnouncement.announcementImages.length}개
            {selectedImages.length > 0 ? " (새 이미지로 교체 예정)" : " (이미지 변경 없음)"}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setIsPreviewOpen(true);
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            미리보기
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              void submitForm();
            }}
            className="rounded-md border border-sky-700 bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editingId ? "공지 수정" : "공지 작성"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-bold text-slate-900">공지 목록</h2>
        <p className="mt-1 text-sm text-slate-600">
          제목을 누르면 해당 공지 내용을 수정 폼에 불러옵니다.
        </p>

        <ul className="mt-3 space-y-2">
          {initialAnnouncements.length > 0 ? (
            initialAnnouncements.map((announcement) => (
              <li key={announcement.id}>
                <button
                  type="button"
                  onClick={() => {
                    applyAnnouncementToForm(announcement);
                    toast.success("공지 내용을 수정 폼으로 불러왔습니다.");
                  }}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left transition",
                    editingId === announcement.id
                      ? "border-sky-300 bg-sky-50"
                      : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      #{announcement.id} {announcement.title}
                    </p>
                    <p className="shrink-0 text-xs text-slate-500">
                      {formatDateTime(announcement.createdAt)}
                    </p>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                    {announcement.isHidden ? (
                      <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-slate-700">
                        숨김
                      </span>
                    ) : null}
                    {announcement.isAdultOnly ? (
                      <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-rose-700">
                        성인만
                      </span>
                    ) : null}
                    {announcement.isEdited ? (
                      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-700">
                        수정됨
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            ))
          ) : (
            <li className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
              등록된 공지사항이 없습니다.
            </li>
          )}
        </ul>
      </section>

      {isPreviewOpen ? (
        <PreviewModal
          modalTitle="공지 미리보기"
          titleLine={title || "(제목 없음)"}
          subLine={editingId ? "수정 미리보기" : "작성 미리보기"}
          content={content}
          command={command}
          onClose={() => {
            setIsPreviewOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function formDataWithId(formData: FormData, announcementId: number) {
  formData.set("announcementId", String(announcementId));
  return formData;
}
