"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

import { createAutoPostAction } from "@/features/board/actions/auto/createAutoPostAction";
import { editAutoPostAction } from "@/features/board/actions/auto/editAutoPostAction";
import { getAutoPostScheduleAction } from "@/features/board/actions/auto/getAutoPostScheduleAction";
import { getAutoPostsAction } from "@/features/board/actions/auto/getAutoPostsAction";
import { saveAutoPostScheduleAction } from "@/features/board/actions/auto/saveAutoPostScheduleAction";
import { startAutoPostAction } from "@/features/board/actions/auto/startAutoPostAction";
import { stopAutoPostAction } from "@/features/board/actions/auto/stopAutoPostAction";
import {
  AUTO_POST_INTERVAL_OPTIONS,
  type AutoPostPayload,
  type AutoPostSchedulePayload,
} from "@/features/board/actions/auto/types";
import { ScrollQuickButtons } from "@/components/ui/ScrollQuickButtons";
import { cn } from "@/lib/cn";
import { AnonymousAuthor } from "@/lib/constants";
import type { SseAutoPostFiredEvent } from "@/types/sse";
import { toast } from "sonner";

import { AutoPostFormControls } from "./AutoPostFormControls";
import { DiceModal } from "./DiceModal";
import { ImageGallery } from "./ImageGallery";
import { InlineImageLightbox } from "./InlineImageLightbox";
import { PostImagePicker } from "./PostImagePicker";
import { PreviewModal } from "./PreviewModal";

const MAX_IMAGE_COUNT = 10;
const CONTENT_TYPE_DEBOUNCE_MS = 300;
const AUTO_POST_DISMISS_ANIMATION_MS = 460;

type ParsedContentType = "text" | "aa" | "novel" | "line";

function toggleCommandToken(command: string, token: string): string {
  const normalizedToken = token.trim().toLowerCase();
  if (!normalizedToken) {
    return command;
  }

  const tokens = command
    .split(".")
    .map((value) => value.trim())
    .filter(Boolean);
  const hasToken = tokens.some(
    (value) => value.toLowerCase() === normalizedToken,
  );

  if (hasToken) {
    return tokens
      .filter((value) => value.toLowerCase() !== normalizedToken)
      .join(".");
  }

  return [...tokens, normalizedToken].join(".");
}

function parseContentType(command: string): ParsedContentType {
  const normalized = command.trim().toLowerCase();
  const splitted = normalized.split(".");
  if (splitted.includes("aa")) return "aa";
  if (splitted.includes("novel")) return "novel";
  if (splitted.includes("line")) return "line";

  return "text";
}

function fixBrokenAa(value: string): string {
  return value.replace(
    /&#x([0-9A-Fa-f]+);|&#([0-9]+);/g,
    (_: unknown, hex: string, dec: string) => {
      const code = hex ? parseInt(hex, 16) : parseInt(dec, 10);
      return String.fromCharCode(code);
    },
  );
}

function formatPostDate(value: Date | string): string {
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
}

interface AutoPostManagerClientProps {
  boardKey: string;
  threadIndex: number;
  initialAutoPosts: AutoPostPayload[];
}

export function AutoPostManagerClient({
  boardKey,
  threadIndex,
  initialAutoPosts,
}: AutoPostManagerClientProps) {
  const rootContainerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const authorStorageKey = `moonshineland:auto-form:${boardKey}:author`;
  const commandStorageKey = `moonshineland:auto-form:${boardKey}:command`;
  const autosizeStorageKey = `moonshineland:auto-form:${boardKey}:autosize`;
  const bottomLockStorageKey = `moonshineland:auto-form:${boardKey}:${threadIndex}:bottom-lock`;
  const imageInputId = `auto-image-${boardKey}-${threadIndex}`;

  const [autoPosts, setAutoPosts] = useState(initialAutoPosts);
  const [author, setAuthor] = useState("");
  const [command, setCommand] = useState("");
  const [content, setContent] = useState("");
  const [contentTypeClassName, setContentTypeClassName] =
    useState<ParsedContentType>("text");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isAutosizeEnabled, setIsAutosizeEnabled] = useState(true);
  const [isBottomLockEnabled, setIsBottomLockEnabled] = useState(false);
  const [isStorageHydrated, setIsStorageHydrated] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDiceOpen, setIsDiceOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScheduleSaving, setIsScheduleSaving] = useState(false);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [schedule, setSchedule] = useState<AutoPostSchedulePayload | null>(
    null,
  );
  const [scheduleIntervalSeconds, setScheduleIntervalSeconds] = useState(60);
  const [scheduleOrderMode, setScheduleOrderMode] = useState<
    "sequence" | "random"
  >("sequence");
  const [scheduleStopWhenArchived, setScheduleStopWhenArchived] =
    useState(true);
  const [fadingAutoPostIds, setFadingAutoPostIds] = useState<number[]>([]);
  const [dismissedAutoPostIds, setDismissedAutoPostIds] = useState<number[]>(
    [],
  );

  const [editingAutoPost, setEditingAutoPost] =
    useState<AutoPostPayload | null>(null);
  const [fullscreenInlineImageUrl, setFullscreenInlineImageUrl] = useState<
    string | null
  >(null);
  const [editAuthor, setEditAuthor] = useState("");
  const [editCommand, setEditCommand] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isEditingSaving, setIsEditingSaving] = useState(false);

  const resizeTextarea = useCallback(() => {
    const textarea = contentRef.current;
    if (!textarea) {
      return;
    }

    if (!isAutosizeEnabled) {
      textarea.style.height = "";
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [isAutosizeEnabled]);

  useEffect(() => {
    resizeTextarea();
  }, [content, resizeTextarea]);

  useEffect(() => {
    const autosizeStored = window.localStorage.getItem(autosizeStorageKey);
    setIsAutosizeEnabled(autosizeStored !== "0");

    const bottomLockStored = window.localStorage.getItem(bottomLockStorageKey);
    setIsBottomLockEnabled(bottomLockStored === "1");

    setIsStorageHydrated(true);
  }, [autosizeStorageKey, bottomLockStorageKey]);

  useEffect(() => {
    if (!isStorageHydrated) {
      return;
    }

    window.localStorage.setItem(
      autosizeStorageKey,
      isAutosizeEnabled ? "1" : "0",
    );
  }, [autosizeStorageKey, isAutosizeEnabled, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) {
      return;
    }

    window.localStorage.setItem(
      bottomLockStorageKey,
      isBottomLockEnabled ? "1" : "0",
    );
  }, [bottomLockStorageKey, isBottomLockEnabled, isStorageHydrated]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setContentTypeClassName(parseContentType(command));
    }, CONTENT_TYPE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [command]);

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

  const removeSelectedImage = useCallback(
    (indexToRemove: number) => {
      const nextFiles = selectedImages.filter(
        (_, index) => index !== indexToRemove,
      );
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

  const clearSelectedImages = useCallback(() => {
    syncSelectedImages([]);
  }, [syncSelectedImages]);

  const handleLoadIdentity = useCallback(() => {
    setAuthor(window.localStorage.getItem(authorStorageKey) ?? "");
    setCommand(window.localStorage.getItem(commandStorageKey) ?? "");
    toast.success("작성자 이름/콘솔 명령어를 불러왔습니다.");
  }, [authorStorageKey, commandStorageKey]);

  const handleClearIdentity = useCallback(() => {
    setAuthor("");
    setCommand("");
    window.localStorage.removeItem(authorStorageKey);
    window.localStorage.removeItem(commandStorageKey);
    toast.success("작성자 이름/콘솔 명령어를 지웠습니다.");
  }, [authorStorageKey, commandStorageKey]);

  const handleRepairAa = useCallback(() => {
    const repaired = fixBrokenAa(content);
    setContent(repaired);
    toast.success("깨진 AA를 보정했습니다.");
  }, [content]);

  const handleToggleAutosize = useCallback(() => {
    setIsAutosizeEnabled((current) => !current);
  }, []);

  const handleToggleCommandToken = useCallback((token: "aa" | "novel") => {
    setCommand((current) => toggleCommandToken(current, token));
  }, []);

  const appendToContent = useCallback((text: string) => {
    setContent((current) => {
      if (!current) {
        return text;
      }
      if (current.endsWith("\n")) {
        return `${current}${text}`;
      }
      return `${current}\n${text}`;
    });
    contentRef.current?.focus();
  }, []);

  const scrollToBottom = useCallback(() => {
    window.requestAnimationFrame(() => {
      const scroller = rootContainerRef.current?.closest("main") ?? null;
      if (scroller) {
        scroller.scrollTo({
          top: scroller.scrollHeight,
          behavior: "smooth",
        });
        return;
      }

      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  const fetchAutoPosts = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (!silent) {
        setIsRefreshing(true);
      }

      try {
        const result = await getAutoPostsAction(boardKey, threadIndex);
        if (!result.success) {
          if (!silent) {
            toast.error(result.message);
          }
          return;
        }

        setAutoPosts(result.autoPosts ?? []);
        setDismissedAutoPostIds((current) =>
          current.filter((id) =>
            (result.autoPosts ?? []).some((item) => item.id === id),
          ),
        );
        setFadingAutoPostIds((current) =>
          current.filter((id) =>
            (result.autoPosts ?? []).some((item) => item.id === id),
          ),
        );

        if (isBottomLockEnabled && !silent) {
          scrollToBottom();
        }

        if (!silent) {
          toast.success("자동투하 레스 목록을 갱신했습니다.");
        }
      } finally {
        if (!silent) {
          setIsRefreshing(false);
        }
      }
    },
    [boardKey, isBottomLockEnabled, scrollToBottom, threadIndex],
  );

  const refreshAutoPosts = useCallback(async () => {
    await fetchAutoPosts();
  }, [fetchAutoPosts]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) {
        return;
      }

      const selectedCount = imageInputRef.current?.files?.length ?? 0;
      if (selectedCount > MAX_IMAGE_COUNT) {
        toast.error(
          `이미지는 최대 ${MAX_IMAGE_COUNT}개까지 첨부할 수 있습니다.`,
        );
        return;
      }

      setIsSubmitting(true);
      try {
        const formData = new FormData(event.currentTarget);
        const result = await createAutoPostAction(formData);
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        setAutoPosts(result.autoPosts ?? []);
        setDismissedAutoPostIds((current) =>
          current.filter((id) =>
            (result.autoPosts ?? []).some((item) => item.id === id),
          ),
        );
        setFadingAutoPostIds((current) =>
          current.filter((id) =>
            (result.autoPosts ?? []).some((item) => item.id === id),
          ),
        );
        window.localStorage.setItem(authorStorageKey, author.trim());
        window.localStorage.setItem(commandStorageKey, command.trim());
        setContent("");
        clearSelectedImages();
        if (imageInputRef.current) {
          imageInputRef.current.value = "";
        }

        toast.success(result.message);

        window.requestAnimationFrame(() => {
          contentRef.current?.focus();
        });

        if (isBottomLockEnabled) {
          scrollToBottom();
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      author,
      authorStorageKey,
      clearSelectedImages,
      command,
      commandStorageKey,
      isBottomLockEnabled,
      isSubmitting,
      scrollToBottom,
    ],
  );

  const openEditModal = useCallback((autoPost: AutoPostPayload) => {
    setEditingAutoPost(autoPost);
    setEditAuthor(autoPost.author);
    setEditCommand(autoPost.contentType === "text" ? "" : autoPost.contentType);
    setEditContent(autoPost.rawContent);
  }, []);

  const submitEdit = useCallback(async () => {
    if (!editingAutoPost) {
      return;
    }

    setIsEditingSaving(true);
    try {
      const formData = new FormData();
      formData.set("boardKey", boardKey);
      formData.set("threadIndex", String(threadIndex));
      formData.set("autoPostId", String(editingAutoPost.id));
      formData.set("author", editAuthor);
      formData.set("command", editCommand);
      formData.set("content", editContent);

      const result = await editAutoPostAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setAutoPosts(result.autoPosts ?? []);
      setDismissedAutoPostIds((current) =>
        current.filter((id) =>
          (result.autoPosts ?? []).some((item) => item.id === id),
        ),
      );
      setFadingAutoPostIds((current) =>
        current.filter((id) =>
          (result.autoPosts ?? []).some((item) => item.id === id),
        ),
      );
      setEditingAutoPost(null);
      toast.success(result.message);
    } finally {
      setIsEditingSaving(false);
    }
  }, [
    boardKey,
    editAuthor,
    editCommand,
    editContent,
    editingAutoPost,
    threadIndex,
  ]);

  const autoPostCountLabel = useMemo(() => {
    return `${autoPosts.length}개`;
  }, [autoPosts.length]);

  const applyScheduleState = useCallback(
    (nextSchedule: AutoPostSchedulePayload | null) => {
      setSchedule(nextSchedule);
      if (!nextSchedule) {
        return;
      }

      setScheduleIntervalSeconds(nextSchedule.intervalSeconds);
      setScheduleOrderMode(nextSchedule.orderMode);
      setScheduleStopWhenArchived(nextSchedule.stopWhenArchived);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const loadSchedule = async () => {
      setIsScheduleLoading(true);
      try {
        const result = await getAutoPostScheduleAction(boardKey, threadIndex);
        if (!result.success) {
          if (!cancelled) {
            toast.error(result.message);
          }
          return;
        }

        if (!cancelled) {
          applyScheduleState(result.schedule ?? null);
        }
      } finally {
        if (!cancelled) {
          setIsScheduleLoading(false);
        }
      }
    };

    void loadSchedule();

    return () => {
      cancelled = true;
    };
  }, [applyScheduleState, boardKey, threadIndex]);

  const handleSaveSchedule = useCallback(async () => {
    setIsScheduleSaving(true);
    try {
      const formData = new FormData();
      formData.set("boardKey", boardKey);
      formData.set("threadIndex", String(threadIndex));
      formData.set("intervalSeconds", String(scheduleIntervalSeconds));
      formData.set("orderMode", scheduleOrderMode);
      formData.set("stopWhenArchived", scheduleStopWhenArchived ? "1" : "0");

      const result = await saveAutoPostScheduleAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      applyScheduleState(result.schedule ?? null);
      toast.success(result.message);
    } finally {
      setIsScheduleSaving(false);
    }
  }, [
    applyScheduleState,
    boardKey,
    scheduleIntervalSeconds,
    scheduleOrderMode,
    scheduleStopWhenArchived,
    threadIndex,
  ]);

  const handleStartAutoPost = useCallback(async () => {
    setIsScheduleSaving(true);
    try {
      const formData = new FormData();
      formData.set("boardKey", boardKey);
      formData.set("threadIndex", String(threadIndex));
      formData.set("intervalSeconds", String(scheduleIntervalSeconds));
      formData.set("orderMode", scheduleOrderMode);
      formData.set("stopWhenArchived", scheduleStopWhenArchived ? "1" : "0");

      const result = await startAutoPostAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      applyScheduleState(result.schedule ?? null);
      toast.success(result.message);
    } finally {
      setIsScheduleSaving(false);
    }
  }, [
    applyScheduleState,
    boardKey,
    scheduleIntervalSeconds,
    scheduleOrderMode,
    scheduleStopWhenArchived,
    threadIndex,
  ]);

  const handleStopAutoPost = useCallback(async () => {
    setIsScheduleSaving(true);
    try {
      const formData = new FormData();
      formData.set("boardKey", boardKey);
      formData.set("threadIndex", String(threadIndex));

      const result = await stopAutoPostAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      applyScheduleState(result.schedule ?? null);
      toast.success(result.message);
    } finally {
      setIsScheduleSaving(false);
    }
  }, [applyScheduleState, boardKey, threadIndex]);

  const scheduleStatusLabel = schedule?.isEnabled
    ? "실행 중"
    : schedule
      ? "중지"
      : "미설정";

  const scheduleNextRunLabel = schedule?.nextRunAt
    ? formatPostDate(schedule.nextRunAt)
    : "-";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (event.shiftKey && key === "q") {
        event.preventDefault();
        handleLoadIdentity();
        return;
      }

      if (event.shiftKey && key === "z") {
        event.preventDefault();
        handleToggleCommandToken("novel");
        return;
      }

      if (event.shiftKey) {
        return;
      }

      if (key === "r") {
        event.preventDefault();
        void refreshAutoPosts();
        return;
      }

      if (key === "q") {
        event.preventDefault();
        handleToggleCommandToken("aa");
        return;
      }

      if (key === "s") {
        event.preventDefault();
        setIsPreviewOpen(true);
        return;
      }

      if (key === "d") {
        event.preventDefault();
        handleRepairAa();
        return;
      }

      if (key === "b") {
        event.preventDefault();
        handleToggleAutosize();
        return;
      }

      if (key === "i") {
        event.preventDefault();
        imageInputRef.current?.click();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    handleLoadIdentity,
    handleRepairAa,
    handleToggleAutosize,
    handleToggleCommandToken,
    refreshAutoPosts,
  ]);

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/sse/boards/${boardKey}/threads/${threadIndex}?receiveNewPosts=false`,
    );

    const onAutoPostFired = (event: MessageEvent) => {
      const data = JSON.parse(event.data) as SseAutoPostFiredEvent;
      const autoPostId = data.autoPostId;

      if (!Number.isInteger(autoPostId) || autoPostId <= 0) {
        return;
      }

      setFadingAutoPostIds((current) =>
        current.includes(autoPostId) ? current : [...current, autoPostId],
      );

      window.setTimeout(() => {
        setDismissedAutoPostIds((current) =>
          current.includes(autoPostId) ? current : [...current, autoPostId],
        );
        setFadingAutoPostIds((current) =>
          current.filter((id) => id !== autoPostId),
        );
      }, AUTO_POST_DISMISS_ANIMATION_MS);
    };

    eventSource.addEventListener("thread:auto-post-fired", onAutoPostFired);

    return () => {
      eventSource.removeEventListener(
        "thread:auto-post-fired",
        onAutoPostFired,
      );
      eventSource.close();
    };
  }, [boardKey, threadIndex]);

  const visibleAutoPosts = useMemo(
    () =>
      autoPosts.filter(
        (autoPost) => !dismissedAutoPostIds.includes(autoPost.id),
      ),
    [autoPosts, dismissedAutoPostIds],
  );

  const openInlineImageFullscreen = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
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
    },
    [],
  );

  return (
    <div ref={rootContainerRef} className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            자동투하 레스 목록
          </h2>
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => {
              void refreshAutoPosts();
            }}
            className="rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isRefreshing ? "갱신 중..." : "목록 갱신"}
          </button>
        </div>

        <ul className="space-y-3">
          {visibleAutoPosts.length > 0 ? (
            visibleAutoPosts.map((autoPost) => (
              <li key={autoPost.id}>
                <article
                  className={cn(
                    "overflow-hidden rounded-lg border border-sky-200 bg-white transition-all duration-500",
                    fadingAutoPostIds.includes(autoPost.id)
                      ? "-translate-y-2 scale-[0.98] opacity-0 blur-[1px]"
                      : "opacity-100",
                  )}
                >
                  <header className="border-b border-sky-200 bg-slate-200 px-5 py-3">
                    <p className="text-[16px] leading-tight text-sky-900">
                      <span className="font-medium">
                        AUTO#{autoPost.autoPostSequence}
                      </span>{" "}
                      <span
                        dangerouslySetInnerHTML={{
                          __html: autoPost.author || AnonymousAuthor,
                        }}
                      ></span>{" "}
                      <span className="text-[13px] text-slate-500">
                        ({autoPost.idcode})
                      </span>{" "}
                      <button
                        type="button"
                        onClick={() => {
                          openEditModal(autoPost);
                        }}
                        className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] leading-none font-medium text-amber-700 hover:bg-amber-100"
                      >
                        수정
                      </button>
                    </p>
                    <p className="mt-1 text-xs text-slate-700">
                      {formatPostDate(autoPost.createdAt)}
                      {autoPost.contentUpdatedAt ? (
                        <span className="ml-2 text-xs text-slate-500">
                          ({formatPostDate(autoPost.contentUpdatedAt)})
                        </span>
                      ) : null}
                    </p>
                    {autoPost.isEdited ? (
                      <span className="mt-1 inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        수정됨
                      </span>
                    ) : null}
                  </header>

                  <div className="px-3 py-4">
                    {!autoPost.isInlineImage ? (
                      <ImageGallery
                        images={autoPost.autoPostImages}
                        altPrefix={`auto-${autoPost.autoPostSequence}`}
                      />
                    ) : null}
                    <div
                      className={cn(
                        "content whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-900",
                        autoPost.contentType,
                      )}
                      onClick={openInlineImageFullscreen}
                      dangerouslySetInnerHTML={{ __html: autoPost.content }}
                    />
                  </div>
                </article>
              </li>
            ))
          ) : (
            <li className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              저장된 자동투하 레스가 없습니다.
            </li>
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            자동투하 레스 작성
          </h2>
          <span className="rounded border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
            현재 저장: {autoPostCountLabel}
          </span>
        </div>

        <AutoPostFormControls
          isAutosizeEnabled={isAutosizeEnabled}
          isBottomLockEnabled={isBottomLockEnabled}
          onRefresh={refreshAutoPosts}
          onLoadIdentity={handleLoadIdentity}
          onClearIdentity={handleClearIdentity}
          onRepairAa={handleRepairAa}
          onToggleAutosize={handleToggleAutosize}
          onOpenPreview={() => {
            setIsPreviewOpen(true);
          }}
          onOpenDice={() => {
            setIsDiceOpen(true);
          }}
          onToggleBottomLock={() => {
            setIsBottomLockEnabled((current) => !current);
          }}
        />

        <div className="mb-3 rounded border border-indigo-200 bg-indigo-50 p-2">
          <div className="grid gap-2 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-slate-700">
              자동투하 주기
              <select
                value={scheduleIntervalSeconds}
                onChange={(event) => {
                  setScheduleIntervalSeconds(Number(event.target.value));
                }}
                className="h-9 rounded border border-indigo-200 bg-white px-2 text-sm text-slate-900"
              >
                {AUTO_POST_INTERVAL_OPTIONS.map((seconds) => (
                  <option key={seconds} value={seconds}>
                    {seconds}초
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-700">
              자동투하 순서
              <select
                value={scheduleOrderMode}
                onChange={(event) => {
                  setScheduleOrderMode(
                    event.target.value === "random" ? "random" : "sequence",
                  );
                }}
                className="h-9 rounded border border-indigo-200 bg-white px-2 text-sm text-slate-900"
              >
                <option value="sequence">순차</option>
                <option value="random">랜덤</option>
              </select>
            </label>

            <label className="flex items-center gap-2 rounded border border-indigo-200 bg-white px-3 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={scheduleStopWhenArchived}
                onChange={(event) => {
                  setScheduleStopWhenArchived(event.target.checked);
                }}
                className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
              />
              스레드 아카이브 시 자동 중단
            </label>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isScheduleSaving || isScheduleLoading}
              onClick={() => {
                void handleStartAutoPost();
              }}
              className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              자동투하 시작
            </button>
            <button
              type="button"
              disabled={isScheduleSaving || isScheduleLoading}
              onClick={() => {
                void handleStopAutoPost();
              }}
              className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              자동투하 중단
            </button>
            <button
              type="button"
              disabled={isScheduleSaving || isScheduleLoading}
              onClick={() => {
                void handleSaveSchedule();
              }}
              className="rounded border border-indigo-300 bg-white px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              자동투하 설정 저장
            </button>
            <span className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
              상태: {scheduleStatusLabel}
            </span>
            <span className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
              다음 투하: {scheduleNextRunLabel}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="hidden" name="boardKey" value={boardKey} />
          <input type="hidden" name="threadIndex" value={threadIndex} />

          <div className="flex flex-col gap-3">
            <input
              name="author"
              type="text"
              placeholder="이름(80자 이내)"
              value={author}
              onChange={(event) => {
                setAuthor(event.target.value);
              }}
              className="h-11 rounded border border-sky-200 bg-slate-50 px-3 text-[15px] text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
            />
            <input
              name="command"
              type="text"
              placeholder="콘솔 명령어"
              value={command}
              onChange={(event) => {
                setCommand(event.target.value);
              }}
              className="h-11 rounded border border-sky-200 bg-slate-50 px-3 text-[15px] text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <textarea
            ref={contentRef}
            onInput={resizeTextarea}
            name="content"
            placeholder="내용"
            rows={6}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
            }}
            className={cn(
              "contentInput w-full resize-y rounded border border-sky-200 bg-slate-50 px-3 py-3 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none",
              contentTypeClassName,
            )}
          />

          <PostImagePicker
            imageInputRef={imageInputRef}
            imageInputId={imageInputId}
            selectedImages={selectedImages}
            onImageChange={applyImageLimit}
            onClearSelectedImages={clearSelectedImages}
            onRemoveSelectedImage={removeSelectedImage}
            onMoveSelectedImage={moveSelectedImage}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded bg-sky-500 text-[18px] font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "작성 중..." : "자동투하 레스 작성"}
          </button>
        </form>
      </section>

      {isPreviewOpen ? (
        <PreviewModal
          content={content}
          author={author || AnonymousAuthor}
          command={command}
          modalTitle="👁 자동투하 레스 미리보기"
          titleLine={`AUTO#? ${author || AnonymousAuthor}${command ? ` (${command})` : ""}`}
          onClose={() => {
            setIsPreviewOpen(false);
          }}
        />
      ) : null}

      {fullscreenInlineImageUrl ? (
        <InlineImageLightbox
          imageUrl={fullscreenInlineImageUrl}
          onClose={() => {
            setFullscreenInlineImageUrl(null);
          }}
        />
      ) : null}

      {isDiceOpen ? (
        <DiceModal
          onClose={() => {
            setIsDiceOpen(false);
          }}
          onInsert={(text) => {
            appendToContent(text);
            toast.success("내용에 주사위 텍스트를 추가했습니다.");
          }}
        />
      ) : null}

      {editingAutoPost ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-b from-white to-sky-50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-sky-100 bg-white/90 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">
                자동투하 레스 수정
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingAutoPost(null);
                }}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                닫기
              </button>
            </div>

            <div className="space-y-3 p-5">
              <input
                type="text"
                value={editAuthor}
                onChange={(event) => {
                  setEditAuthor(event.target.value);
                }}
                placeholder="작성자"
                className="h-11 w-full rounded border border-sky-200 bg-slate-50 px-3 text-[15px] text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
              />
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
                    void submitEdit();
                  }}
                  disabled={isEditingSaving}
                  className="inline-flex h-10 items-center justify-center rounded bg-amber-500 px-4 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isEditingSaving ? "저장 중..." : "수정 저장"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAutoPost(null);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ScrollQuickButtons containerRef={rootContainerRef} />
    </div>
  );
}
