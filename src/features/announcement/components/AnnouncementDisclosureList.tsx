"use client";

import { useMemo, useState } from "react";

import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { AnnouncementWithRelations } from "@/features/announcement/queries";
import { ImageGallery } from "@/features/board/components/ImageGallery";
import {
  HiddenAttachmentImageNotice,
  ImageVisibilityToggleRow,
} from "@/components/ui/ImageVisibilityControls";
import { useHideImagesPreference } from "@/hooks/useHideImagesPreference";
import {
  countInlineImagesInHtml,
  replaceInlineImagesWithMarker,
} from "@/lib/contentImages";

interface AnnouncementDisclosureListProps {
  announcements: AnnouncementWithRelations[];
  emptyMessage?: string;
  compact?: boolean;
}

function AnnouncementBadges({
  announcement,
}: {
  announcement: AnnouncementWithRelations;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {announcement.isAdultOnly ? (
        <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
          성인만
        </span>
      ) : null}
      {announcement.isEdited ? (
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          수정됨
        </span>
      ) : null}
      {announcement.isHidden ? (
        <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
          숨김
        </span>
      ) : null}
    </div>
  );
}

function AnnouncementContentBody({
  announcement,
}: {
  announcement: AnnouncementWithRelations;
}) {
  const { hideImages: initialHideImages } = useHideImagesPreference();
  const [hideImages, setHideImages] = useState(initialHideImages);
  const galleryImageCount = announcement.isInlineImage
    ? 0
    : announcement.announcementImages.length;
  const inlineImageCount = useMemo(
    () => countInlineImagesInHtml(announcement.content),
    [announcement.content],
  );
  const hasAnyImage = galleryImageCount > 0 || inlineImageCount > 0;
  const renderedContent = useMemo(() => {
    if (!hideImages) {
      return announcement.content;
    }

    return replaceInlineImagesWithMarker(announcement.content).html;
  }, [announcement.content, hideImages]);
  const hiddenImageCount = hideImages ? galleryImageCount + inlineImageCount : 0;

  return (
    <>
      <ImageVisibilityToggleRow
        show={hasAnyImage}
        hideImages={hideImages}
        hiddenImageCount={hiddenImageCount}
        onToggle={() => {
          setHideImages((current) => !current);
        }}
      />

      {!announcement.isInlineImage ? (
        hideImages ? (
          <HiddenAttachmentImageNotice
            count={announcement.announcementImages.length}
          />
        ) : (
          <ImageGallery
            images={announcement.announcementImages}
            altPrefix={`announcement-${announcement.id}`}
          />
        )
      ) : null}

      <div
        className={cn(
          "content break-words text-[14px] leading-relaxed text-slate-900 sm:text-[15px]",
          announcement.contentType,
        )}
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />
    </>
  );
}

export function AnnouncementDisclosureList({
  announcements,
  emptyMessage = "등록된 공지사항이 없습니다.",
  compact = false,
}: AnnouncementDisclosureListProps) {
  if (announcements.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", compact ? "space-y-2" : "space-y-3")}>
      {announcements.map((announcement) => (
        <details
          key={announcement.id}
          className="group overflow-hidden rounded-2xl border border-sky-200 bg-white open:border-sky-300"
        >
          <summary className="cursor-pointer list-none px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-sky-900 sm:text-[17px]">
                  {announcement.title}
                </p>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  {formatRelativeTime(announcement.createdAt)} · {formatDateTime(announcement.createdAt)}
                </p>
              </div>
              <AnnouncementBadges announcement={announcement} />
            </div>
          </summary>

          <div className="border-t border-sky-100 bg-gradient-to-b from-sky-50/55 to-white px-4 py-4 sm:px-5 sm:py-5">
            <AnnouncementContentBody announcement={announcement} />
          </div>
        </details>
      ))}
    </div>
  );
}
