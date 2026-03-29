import { useState, type MouseEvent } from "react";

import { banThreadUserByPostAction } from "@/features/board/actions/post/banThreadUserByPostAction";
import { editPostAction } from "@/features/board/actions/post/editPostAction";
import { getPostEditHistoryAction } from "@/features/board/actions/post/getPostEditHistoryAction";
import { hidePostAction } from "@/features/board/actions/post/hidePostAction";
import { unbanThreadUserByPostAction } from "@/features/board/actions/post/unbanThreadUserByPostAction";
import { cn } from "@/lib/cn";
import { AnonymousAuthor } from "@/lib/constants";
import type { PostWithImages } from "@/types/post";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ImageGallery } from "./ImageGallery";
import { InlineImageLightbox } from "./InlineImageLightbox";

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
  const contentTypeLabel = post.contentType !== "text" ? "</>" : null;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCommand, setEditCommand] = useState(
    post.contentType === "text" ? "" : post.contentType,
  );
  const [editContent, setEditContent] = useState(post.rawContent);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [fullscreenInlineImageUrl, setFullscreenInlineImageUrl] = useState<string | null>(null);
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

    toast.success(post.contentType === "aa" ? "AA를 제거했습니다." : "AA를 적용했습니다.");
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
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const image = target.closest("img.content-inline-image") as HTMLImageElement | null;
    if (!image) {
      return;
    }

    event.preventDefault();
    setFullscreenInlineImageUrl(image.currentSrc || image.src);
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
      <header className="border-b border-sky-200 bg-slate-200 px-6 py-4">
        <p className="text-[18px] leading-tight text-sky-900">
          <span className="font-medium">#{post.postOrder}</span>{" "}
          <span
            dangerouslySetInnerHTML={{
              __html: author,
            }}
          ></span>{" "}
          <span className="text-[14px] leading-tight text-slate-500">
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
        <p className="mt-2 text-[15px] leading-tight text-slate-700">
          {formatPostDate(post.createdAt)}
          {post.isEdited && post.contentUpdatedAt ? (
            <span className="ml-2 text-[12px] text-slate-500">
              ({formatPostDate(post.contentUpdatedAt)})
            </span>
          ) : null}
        </p>
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

      <div className="px-3 py-4">
        {!post.isInlineImage ? (
          <ImageGallery
            images={post.postImages}
            altPrefix={`post-${post.postOrder}`}
          />
        ) : null}
        <div
          className={cn(
            "content whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-900",
            post.contentType,
          )}
          onClick={openInlineImageFullscreen}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>

      {fullscreenInlineImageUrl ? (
        <InlineImageLightbox
          imageUrl={fullscreenInlineImageUrl}
          onClose={() => {
            setFullscreenInlineImageUrl(null);
          }}
        />
      ) : null}

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-b from-white to-sky-50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-sky-100 bg-white/90 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">레스 수정</h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditOpen(false);
                }}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                닫기
              </button>
            </div>

            <div className="space-y-3 p-5">
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
                value={editContent}
                onChange={(event) => {
                  setEditContent(event.target.value);
                }}
                rows={10}
                placeholder="내용"
                className="w-full resize-y rounded border border-sky-200 bg-slate-50 px-3 py-3 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
              />

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                  }}
                  className="h-11 flex-1 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void submitEdit();
                  }}
                  disabled={isSavingEdit}
                  className="h-11 flex-1 rounded-lg bg-sky-500 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSavingEdit ? "저장 중..." : "수정 저장"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isHistoryOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-b from-white to-sky-50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-sky-100 bg-white/90 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">수정 이력</h3>
              <button
                type="button"
                onClick={() => {
                  setIsHistoryOpen(false);
                }}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                닫기
              </button>
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-auto p-5">
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
