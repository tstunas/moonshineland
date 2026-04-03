import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";

import { banThreadUserByPostAction } from "@/features/board/actions/post/banThreadUserByPostAction";
import { editPostAction } from "@/features/board/actions/post/editPostAction";
import { getAnchorPostsAction } from "@/features/board/actions/post/getAnchorPostsAction";
import { getPostEditHistoryAction } from "@/features/board/actions/post/getPostEditHistoryAction";
import { hidePostAction } from "@/features/board/actions/post/hidePostAction";
import { unbanThreadUserByPostAction } from "@/features/board/actions/post/unbanThreadUserByPostAction";
import { useHideImagesPreference } from "@/hooks/useHideImagesPreference";
import { useResponsiveTextareaRows } from "@/hooks/useResponsiveTextareaRows";
import {
  HiddenAttachmentImageNotice,
  ImageVisibilityToggleRow,
} from "@/components/ui/ImageVisibilityControls";
import { cn } from "@/lib/cn";
import {
  countInlineImagesInHtml,
  replaceInlineImagesWithMarker,
} from "@/lib/contentImages";
import { AnonymousAuthor } from "@/lib/constants";
import type { PostWithImages } from "@/types/post";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ImageGallery } from "./ImageGallery";
import { InlineImageLightbox } from "./InlineImageLightbox";

type ParsedContentType = "text" | "aa" | "novel" | "line";
const EDIT_TEXTAREA_MAX_ROWS = 30;
const CONTENT_TYPE_TOKENS = ["text", "aa", "novel", "line"] as const;

function setSingleContentTypeToken(
  command: string,
  selected: ParsedContentType,
): string {
  const filteredTokens = command
    .split(".")
    .map((value) => value.trim())
    .filter(
      (value) =>
        value.length > 0 &&
        !CONTENT_TYPE_TOKENS.includes(
          value.toLowerCase() as (typeof CONTENT_TYPE_TOKENS)[number],
        ),
    );

  return [...filteredTokens, selected].join(".");
}

function parseContentType(command: string): ParsedContentType {
  const normalized = command.trim().toLowerCase();
  const splitted = normalized.split(".");
  if (splitted.includes("aa")) return "aa";
  if (splitted.includes("novel")) return "novel";
  if (splitted.includes("line")) return "line";

  return "text";
}

function formatAuthorLabelAllowBoldOnly(rawLabel: string): string {
  const escaped = rawLabel
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  return escaped
    .replaceAll(/&lt;b&gt;/gi, "<b>")
    .replaceAll(/&lt;\/b&gt;/gi, "</b>");
}

export function PostItem({
  post,
  boardKey,
  threadIndex,
  canManageThread,
  isAdminMode,
}: {
  post: PostWithImages;
  boardKey: string;
  threadIndex: number;
  canManageThread: boolean;
  isAdminMode: boolean;
}) {
  const router = useRouter();
  const author = post.author || AnonymousAuthor;
  const authorLabelHtml = formatAuthorLabelAllowBoldOnly(author);
  const contentTypeLabel = post.contentType !== "text" ? "</>" : null;
  const textareaRows = useResponsiveTextareaRows();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCommand, setEditCommand] = useState(
    post.contentType === "text" ? "" : post.contentType,
  );
  const [editContent, setEditContent] = useState(post.rawContent);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const editContentRef = useRef<HTMLTextAreaElement | null>(null);
  const [fullscreenInlineImageUrl, setFullscreenInlineImageUrl] = useState<
    string | null
  >(null);
  const { hideImages: initialHideImages } = useHideImagesPreference();
  const [hideImages, setHideImages] = useState(initialHideImages);
  const [isAnchorModalOpen, setIsAnchorModalOpen] = useState(false);
  const [isAnchorLoading, setIsAnchorLoading] = useState(false);
  const [anchorModalTitle, setAnchorModalTitle] = useState("");
  const [anchorModalBoardKey, setAnchorModalBoardKey] = useState<string | null>(
    null,
  );
  const [anchorModalThreadIndex, setAnchorModalThreadIndex] = useState<
    number | null
  >(null);
  const [anchorModalError, setAnchorModalError] = useState<string | null>(null);
  const [anchorPosts, setAnchorPosts] = useState<PostWithImages[]>([]);
  const [editHistories, setEditHistories] = useState<
    Array<{
      id: number;
      previousRawContent: string;
      previousContentType: string;
      previousCreatedAt: string;
      previousContentUpdatedAt: string | null;
      createdAt: string;
    }>
  >([]);

  const canShowAdminActions = canManageThread && isAdminMode;
  const showHiddenPostStyle = canShowAdminActions && post.isHidden;
  const galleryImageCount = post.isInlineImage ? 0 : post.postImages.length;
  const inlineImageCount = useMemo(
    () => countInlineImagesInHtml(post.content),
    [post.content],
  );
  const hasAnyImage = galleryImageCount > 0 || inlineImageCount > 0;
  const renderedContent = useMemo(() => {
    if (!hideImages) {
      return post.content;
    }
    return replaceInlineImagesWithMarker(post.content).html;
  }, [hideImages, post.content]);
  const editContentTypeClassName = useMemo(
    () => parseContentType(editCommand),
    [editCommand],
  );
  const hiddenImageCount = hideImages
    ? galleryImageCount + inlineImageCount
    : 0;

  const resizeEditTextarea = useCallback(() => {
    const textarea = editContentRef.current;
    if (!textarea) {
      return;
    }

    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight);
    const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
    const resolvedLineHeight = Number.isFinite(lineHeight) ? lineHeight : 24;
    const maxHeight =
      resolvedLineHeight * EDIT_TEXTAREA_MAX_ROWS + paddingTop + paddingBottom;
    textarea.style.maxHeight = `${maxHeight}px`;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    if (!isEditOpen) {
      return;
    }

    resizeEditTextarea();
  }, [editContent, isEditOpen, resizeEditTextarea, textareaRows]);

  useEffect(() => {
    if (!isEditOpen) {
      return;
    }

    const handleResize = () => {
      resizeEditTextarea();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isEditOpen, resizeEditTextarea]);

  const copyAnchor = async () => {
    try {
      await navigator.clipboard.writeText(
        `>${boardKey}>${threadIndex}>${post.postOrder}`,
      );
      toast.success("앵커를 복사했습니다.");
    } catch {
      toast.error("앵커 복사에 실패했습니다.");
    }
  };

  const copyRawContent = async () => {
    try {
      await navigator.clipboard.writeText(post.rawContent);
      toast.success("원문(rawContent)을 복사했습니다.");
    } catch {
      toast.error("원문 복사에 실패했습니다.");
    }
  };

  const hidePost = async () => {
    const formData = new FormData();
    formData.set("boardKey", boardKey);
    formData.set("threadIndex", String(threadIndex));
    formData.set("postId", String(post.id));

    const result = await hidePostAction(formData);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.refresh();
  };

  const toggleAa = async () => {
    const formData = new FormData();
    formData.set("boardKey", boardKey);
    formData.set("threadIndex", String(threadIndex));
    formData.set("postId", String(post.id));
    formData.set("command", post.contentType === "aa" ? "" : "aa");

    const result = await editPostAction(formData);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(
      post.contentType === "aa" ? "AA를 제거했습니다." : "AA를 적용했습니다.",
    );
  };

  const banUser = async () => {
    const formData = new FormData();
    formData.set("boardKey", boardKey);
    formData.set("threadIndex", String(threadIndex));
    formData.set("postId", String(post.id));

    const result = await banThreadUserByPostAction(formData);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    if (result.alreadyBanned) {
      const shouldUnban = window.confirm(
        "이미 밴한 사용자입니다. 밴을 해제할까요?",
      );

      if (!shouldUnban) {
        toast.success(result.message);
        return;
      }

      const unbanResult = await unbanThreadUserByPostAction(formData);
      if (!unbanResult.success) {
        toast.error(unbanResult.message);
        return;
      }

      toast.success(unbanResult.message);
      return;
    }

    toast.success(result.message);
  };

  const openEditModal = () => {
    setEditCommand(post.contentType === "text" ? "" : post.contentType);
    setEditContent(post.rawContent);
    setIsEditOpen(true);
  };

  const applyEditContentType = useCallback((contentType: ParsedContentType) => {
    setEditCommand((current) =>
      setSingleContentTypeToken(current, contentType),
    );
  }, []);

  const submitEdit = async () => {
    setIsSavingEdit(true);
    try {
      const formData = new FormData();
      formData.set("boardKey", boardKey);
      formData.set("threadIndex", String(threadIndex));
      formData.set("postId", String(post.id));
      formData.set("command", editCommand);
      formData.set("content", editContent);

      const result = await editPostAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setIsEditOpen(false);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openEditHistoryModal = async () => {
    setIsHistoryOpen(true);
    setIsHistoryLoading(true);
    try {
      const formData = new FormData();
      formData.set("boardKey", boardKey);
      formData.set("threadIndex", String(threadIndex));
      formData.set("postId", String(post.id));

      const result = await getPostEditHistoryAction(formData);
      if (!result.success) {
        toast.error(result.message);
        setEditHistories([]);
        return;
      }

      setEditHistories(result.histories ?? []);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const formatPostDate = (value: Date | string) => {
    const date = value instanceof Date ? value : new Date(value);
    const weekday = new Intl.DateTimeFormat("ko-KR", {
      weekday: "short",
      timeZone: "Asia/Seoul",
    }).format(date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} (${weekday}) ${hours}:${minutes}:${seconds}`;
  };

  const openInlineImageFullscreen = (event: MouseEvent<HTMLDivElement>) => {
    if (hideImages) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const image = target.closest(
      "img.content-inline-image",
    ) as HTMLImageElement | null;
    if (!image) {
      return;
    }

    event.preventDefault();
    setFullscreenInlineImageUrl(image.currentSrc || image.src);
  };

  const parseAnchorShiftTarget = (event: MouseEvent<HTMLDivElement>) => {
    if (!event.shiftKey) {
      return null;
    }

    const target = event.target as HTMLElement | null;
    const anchor = target?.closest("a") as HTMLAnchorElement | null;
    const href = anchor?.getAttribute("href")?.trim();

    if (!href) {
      return null;
    }

    const match = href.match(
      /^\/board\/([a-z]+)\/(\d+)(?:\/(\d+)(?:\/(\d+))?)?\/?$/,
    );

    if (!match) {
      return null;
    }

    const [, targetBoardKey, targetThreadIndexText, startText, endText] = match;
    if (!startText) {
      return null;
    }

    const targetThreadIndex = Number(targetThreadIndexText);
    const start = Number(startText);
    const end = endText ? Number(endText) : undefined;

    if (
      !Number.isInteger(targetThreadIndex) ||
      targetThreadIndex <= 0 ||
      !Number.isInteger(start) ||
      start <= 0 ||
      (typeof end === "number" && (!Number.isInteger(end) || end <= 0))
    ) {
      return null;
    }

    return {
      boardKey: targetBoardKey,
      threadIndex: targetThreadIndex,
      start,
      end,
    };
  };

  const openAnchorModal = async (target: {
    boardKey: string;
    threadIndex: number;
    start: number;
    end?: number;
  }) => {
    setAnchorModalBoardKey(target.boardKey);
    setAnchorModalThreadIndex(target.threadIndex);
    setIsAnchorModalOpen(true);
    setIsAnchorLoading(true);
    setAnchorModalError(null);
    setAnchorPosts([]);

    const orderLabel =
      typeof target.end === "number"
        ? `${String(target.start)}-${String(target.end)}`
        : String(target.start);
    setAnchorModalTitle(
      `${target.boardKey} / ${String(target.threadIndex)} / >>${orderLabel}`,
    );

    try {
      const posts = await getAnchorPostsAction(
        target.boardKey,
        target.threadIndex,
        target.start,
        target.end,
      );

      setAnchorPosts(posts);
      if (posts.length === 0) {
        setAnchorModalError("해당 앵커 범위의 레스를 찾을 수 없습니다.");
      }
    } catch {
      setAnchorModalError("앵커 레스를 불러오지 못했습니다.");
    } finally {
      setIsAnchorLoading(false);
    }
  };

  const handleContentClick = (event: MouseEvent<HTMLDivElement>) => {
    const anchorTarget = parseAnchorShiftTarget(event);
    if (anchorTarget) {
      event.preventDefault();
      event.stopPropagation();
      void openAnchorModal(anchorTarget);
      return;
    }

    openInlineImageFullscreen(event);
  };

  const toggleImageVisibility = () => {
    setHideImages((current) => !current);
  };

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border border-sky-200 bg-white",
        showHiddenPostStyle
          ? "border-dashed border-rose-300 bg-rose-50/40 opacity-80"
          : "",
      )}
    >
      <header className="border-b border-sky-200 bg-slate-200 px-4 py-3 sm:px-6 sm:py-4">
        <p className="text-[16px] leading-tight text-sky-900 sm:text-[18px]">
          <span className="font-medium">#{post.postOrder}</span>{" "}
          <span
            dangerouslySetInnerHTML={{
              __html: authorLabelHtml,
            }}
          ></span>{" "}
          <span className="text-[12px] leading-tight text-slate-500 sm:text-[14px]">
            ({post.idcode})
          </span>{" "}
          {contentTypeLabel ? (
            <button
              type="button"
              onClick={() => {
                void copyRawContent();
              }}
              title="원문(rawContent) 복사"
              className="rounded border border-sky-300 px-1.5 py-0.5 text-[18px] leading-none text-sky-700 hover:bg-sky-50"
            >
              {contentTypeLabel}
            </button>
          ) : null}{" "}
          <button
            type="button"
            onClick={() => {
              void copyAnchor();
            }}
            className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] leading-none text-slate-700 hover:bg-slate-50"
          >
            앵커 복사
          </button>
          {canShowAdminActions ? (
            <>
              {" "}
              <button
                type="button"
                onClick={() => {
                  void hidePost();
                }}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[11px] leading-none",
                  post.isHidden
                    ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100",
                )}
              >
                {post.isHidden ? "하이드 해제" : "하이드"}
              </button>{" "}
              <button
                type="button"
                onClick={openEditModal}
                className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] leading-none text-amber-700 hover:bg-amber-100"
              >
                수정
              </button>{" "}
              <button
                type="button"
                onClick={() => {
                  void toggleAa();
                }}
                className="rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[11px] leading-none text-sky-700 hover:bg-sky-100"
              >
                {post.contentType === "aa" ? "AA 제거" : "AA 적용"}
              </button>{" "}
              <button
                type="button"
                onClick={() => {
                  void banUser();
                }}
                className="rounded border border-fuchsia-300 bg-fuchsia-50 px-1.5 py-0.5 text-[11px] leading-none text-fuchsia-700 hover:bg-fuchsia-100"
              >
                밴하기
              </button>
            </>
          ) : null}
        </p>
        <div className="mt-1 text-[13px] leading-tight text-slate-500">
          <span>{formatPostDate(post.createdAt)}</span>
          {post.isEdited && post.contentUpdatedAt ? (
            <span className="text-[12px] text-slate-500">
              ({formatPostDate(post.contentUpdatedAt)})
            </span>
          ) : null}
        </div>
        {post.isEdited || post.isAutoPost ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {showHiddenPostStyle ? (
              <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                하이드됨
              </span>
            ) : null}
            {post.isEdited ? (
              <button
                type="button"
                onClick={() => {
                  void openEditHistoryModal();
                }}
                className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-100"
              >
                수정됨
              </button>
            ) : null}
            {post.isAutoPost ? (
              <span className="inline-flex items-center rounded-full border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                자동투하
              </span>
            ) : null}
          </div>
        ) : showHiddenPostStyle ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
              하이드됨
            </span>
          </div>
        ) : null}
      </header>

      <div className="px-2.5 py-3 sm:px-3 sm:py-4">
        <ImageVisibilityToggleRow
          show={hasAnyImage}
          hideImages={hideImages}
          hiddenImageCount={hiddenImageCount}
          onToggle={toggleImageVisibility}
        />

        {!post.isInlineImage ? (
          hideImages ? (
            <HiddenAttachmentImageNotice count={post.postImages.length} />
          ) : (
            <ImageGallery
              images={post.postImages}
              altPrefix={`post-${post.postOrder}`}
            />
          )
        ) : null}
        <div
          className={cn(
            "content whitespace-pre-wrap break-words text-[14px] leading-relaxed text-slate-900 sm:text-[15px]",
            post.contentType,
          )}
          onClick={handleContentClick}
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      </div>

      {isAnchorModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-0 sm:p-4">
          <div className="h-full w-full overflow-hidden border-0 bg-gradient-to-b from-white to-sky-50 shadow-2xl sm:h-auto sm:max-w-3xl sm:rounded-2xl sm:border sm:border-sky-200">
            <div className="flex items-center justify-between border-b border-sky-100 bg-white/90 px-4 py-3 sm:px-5 sm:py-4">
              <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                앵커 조회: {anchorModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAnchorModalOpen(false);
                  setAnchorModalBoardKey(null);
                  setAnchorModalThreadIndex(null);
                }}
                className="min-h-11 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                닫기
              </button>
            </div>

            <div className="max-h-[calc(100vh-4.25rem-env(safe-area-inset-bottom))] overflow-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-h-[70vh] sm:p-5">
              {isAnchorLoading ? (
                <p className="text-sm text-slate-600">
                  앵커 레스를 불러오는 중입니다...
                </p>
              ) : anchorModalError ? (
                <p className="text-sm text-rose-700">{anchorModalError}</p>
              ) : (
                <ul className="space-y-3">
                  {anchorPosts.map((anchorPost) => (
                    <li
                      key={anchorPost.id}
                      className="rounded-xl border border-slate-200 bg-white/90 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-sky-800">
                          #{anchorPost.postOrder}{" "}
                          {anchorPost.author || AnonymousAuthor}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              !anchorModalBoardKey ||
                              !anchorModalThreadIndex
                            ) {
                              return;
                            }
                            const href = `/board/${anchorModalBoardKey}/${String(anchorModalThreadIndex)}/${String(anchorPost.postOrder)}`;
                            setIsAnchorModalOpen(false);
                            router.push(href);
                          }}
                          className="rounded border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 hover:bg-sky-100"
                        >
                          원본으로 이동
                        </button>
                      </div>
                      <div
                        className={cn(
                          "content mt-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-900",
                          anchorPost.contentType,
                        )}
                        dangerouslySetInnerHTML={{ __html: anchorPost.content }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {fullscreenInlineImageUrl ? (
        <InlineImageLightbox
          imageUrl={fullscreenInlineImageUrl}
          onClose={() => {
            setFullscreenInlineImageUrl(null);
          }}
        />
      ) : null}

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-0 sm:p-4">
          <div className="flex h-full max-h-[100dvh] w-full flex-col overflow-hidden border-0 bg-gradient-to-b from-white to-sky-50 shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-sky-200">
            <div className="flex items-center justify-between border-b border-sky-100 bg-white/90 px-4 py-3 sm:px-5 sm:py-4">
              <h3 className="text-lg font-bold text-slate-900">레스 수정</h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditOpen(false);
                }}
                className="min-h-11 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                닫기
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CONTENT_TYPE_TOKENS.map((contentType) => (
                  <button
                    key={contentType}
                    type="button"
                    onClick={() => {
                      applyEditContentType(contentType);
                    }}
                    className={cn(
                      "min-h-10 rounded-lg border px-2 text-xs font-semibold transition-colors",
                      editContentTypeClassName === contentType
                        ? "border-sky-500 bg-sky-500 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    {contentType === "text"
                      ? "일반 텍스트"
                      : contentType === "aa"
                        ? "AA"
                        : contentType === "novel"
                          ? "소설"
                          : "줄간격 크게"}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={editCommand}
                onChange={(event) => {
                  setEditCommand(event.target.value);
                }}
                placeholder="콘솔 명령어"
                className="h-11 w-full rounded border border-sky-200 bg-slate-50 px-3 text-[15px] text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
              />
              <textarea
                ref={editContentRef}
                onInput={resizeEditTextarea}
                value={editContent}
                onChange={(event) => {
                  setEditContent(event.target.value);
                }}
                rows={textareaRows}
                placeholder="내용"
                className={cn(
                  "contentInput w-full resize-y rounded border border-sky-200 bg-slate-50 px-3 py-3 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none",
                  editContentTypeClassName === "text"
                    ? ""
                    : editContentTypeClassName,
                )}
              />

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                  }}
                  className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void submitEdit();
                  }}
                  disabled={isSavingEdit}
                  className="min-h-11 flex-1 rounded-lg bg-sky-500 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSavingEdit ? "저장 중..." : "수정 저장"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isHistoryOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-0 sm:p-4">
          <div className="h-full w-full overflow-hidden border-0 bg-gradient-to-b from-white to-sky-50 shadow-2xl sm:h-auto sm:max-w-3xl sm:rounded-2xl sm:border sm:border-sky-200">
            <div className="flex items-center justify-between border-b border-sky-100 bg-white/90 px-4 py-3 sm:px-5 sm:py-4">
              <h3 className="text-lg font-bold text-slate-900">수정 이력</h3>
              <button
                type="button"
                onClick={() => {
                  setIsHistoryOpen(false);
                }}
                className="min-h-11 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                닫기
              </button>
            </div>

            <div className="max-h-[calc(100vh-4.25rem-env(safe-area-inset-bottom))] space-y-3 overflow-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-h-[70vh] sm:p-5">
              {isHistoryLoading ? (
                <p className="text-sm text-slate-600">
                  이력을 불러오는 중입니다...
                </p>
              ) : editHistories.length === 0 ? (
                <p className="text-sm text-slate-600">
                  저장된 수정 이력이 없습니다.
                </p>
              ) : (
                editHistories.map((history) => (
                  <section
                    key={history.id}
                    className="rounded-xl border border-slate-200 bg-white/90 p-3"
                  >
                    <p className="text-xs text-slate-500">
                      이력 저장: {formatPostDate(history.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      이전 내용 시각:{" "}
                      {formatPostDate(history.previousCreatedAt)}
                      {history.previousContentUpdatedAt
                        ? ` (${formatPostDate(history.previousContentUpdatedAt)})`
                        : ""}
                    </p>
                    <div className="mt-2 inline-flex rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                      contentType: {history.previousContentType}
                    </div>
                    <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded border border-slate-200 bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-800">
                      {history.previousRawContent}
                    </pre>
                  </section>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
