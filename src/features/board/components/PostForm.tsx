"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  adjustThreadPostLimitAction,
} from "@/features/board/actions/thread/adjustThreadPostLimitAction";
import { createPostAction } from "@/features/board/actions/post/createPostAction";
import {
  updateThreadSettingsAction,
} from "@/features/board/actions/thread/updateThreadSettingsAction";
import {
  buildExternalText,
  copyExternalHtmlToClipboard,
  copyExternalImage as copyExternalImageAsset,
} from "@/features/board/lib/postExternalExport";
import { cn } from "@/lib/cn";
import type { Post } from "@/types/post";
import type { Thread } from "@/types/thread";
import { toast } from "sonner";

import { DiceModal } from "./DiceModal";
import { PostFormControls } from "./PostFormControls";
import { PostImagePicker } from "./PostImagePicker";
import { PreviewModal } from "./PreviewModal";
import { ThreadSettingsModal } from "./ThreadSettingsModal";
import { AnonymousAuthor } from "@/lib/constants";
import { PREFS_DEFAULT_AUTHOR } from "@/lib/preferences";

const MAX_IMAGE_COUNT = 10;
const CONTENT_TYPE_DEBOUNCE_MS = 300;

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
  const hasToken = tokens.some((value) => value.toLowerCase() === normalizedToken);

  if (hasToken) {
    return tokens
      .filter((value) => value.toLowerCase() !== normalizedToken)
      .join(".");
  }

  return [...tokens, normalizedToken].join(".");
}

type ThreadPatch = Partial<
  Pick<
    Thread,
    | "title"
    | "isAdultOnly"
    | "isChat"
    | "isHidden"
    | "isSecret"
    | "postLimit"
    | "isArchive"
  >
>;

interface PostFormProps {
  boardKey: string;
  threadIndex: number;
  isSignedIn: boolean;
  posts: Post[];
  thread: Thread;
  mode: "recent" | "range" | "all";
  canManageThread: boolean;
  isReplyAlertEnabled: boolean;
  isBottomLockEnabled: boolean;
  onToggleReplyAlert: (enabled: boolean) => void;
  onToggleBottomLock: (enabled: boolean) => void;
  onRequestRefresh: () => Promise<void> | void;
  onPostCreated: () => void;
  onThreadChanged: (patch: ThreadPatch) => void;
  onAdminModeChange?: (enabled: boolean) => void;
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

function parseContentType(command: string): ParsedContentType {
  const normalized = command.trim().toLowerCase();
  const splitted = normalized.split(".");
  if (splitted.includes("aa")) return "aa";
  if (splitted.includes("novel")) return "novel";
  if (splitted.includes("line")) return "line";

  return "text";
}

export function PostForm({
  boardKey,
  threadIndex,
  isSignedIn,
  posts,
  thread,
  mode,
  canManageThread,
  isReplyAlertEnabled,
  isBottomLockEnabled,
  onToggleReplyAlert,
  onToggleBottomLock,
  onRequestRefresh,
  onPostCreated,
  onThreadChanged,
  onAdminModeChange,
}: PostFormProps) {
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const onToggleReplyAlertRef = useRef(onToggleReplyAlert);
  const authorStorageKey = `moonshineland:form:${boardKey}:author`;
  const commandStorageKey = `moonshineland:form:${boardKey}:command`;
  const autosizeStorageKey = `moonshineland:form:${boardKey}:post-autosize`;
  const replyAlertStorageKey = `moonshineland:thread-reply-alert:${boardKey}:${threadIndex}`;
  const imageInputId = `thread-image-${boardKey}-${threadIndex}`;

  const [author, setAuthor] = useState("");
  const [command, setCommand] = useState("");
  const [contentTypeClassName, setContentTypeClassName] =
    useState<ParsedContentType>("text");
  const [content, setContent] = useState("");
  const [isAutosizeEnabled, setIsAutosizeEnabled] = useState(true);
  const [isStorageHydrated, setIsStorageHydrated] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDiceOpen, setIsDiceOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isThreadEditOpen, setIsThreadEditOpen] = useState(false);
  const [isSavingThread, setIsSavingThread] = useState(false);

  const [threadTitle, setThreadTitle] = useState(thread.title);
  const [threadPassword, setThreadPassword] = useState("");
  const [clearPassword, setClearPassword] = useState(false);
  const [threadIsAdultOnly, setThreadIsAdultOnly] = useState(thread.isAdultOnly);
  const [threadIsChat, setThreadIsChat] = useState(thread.isChat);
  const [threadIsHidden, setThreadIsHidden] = useState(thread.isHidden);
  const [threadIsSecret, setThreadIsSecret] = useState(thread.isSecret);
  const [allowOthersReply, setAllowOthersReply] = useState(!thread.isArchive);

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
    onToggleReplyAlertRef.current = onToggleReplyAlert;
  }, [onToggleReplyAlert]);

  useEffect(() => {
    const autosizeStored = window.localStorage.getItem(autosizeStorageKey);
    setIsAutosizeEnabled(autosizeStored !== "0");

    const replyAlertStored = window.localStorage.getItem(replyAlertStorageKey);
    const nextReplyAlertEnabled = replyAlertStored !== "0";
    if (nextReplyAlertEnabled !== isReplyAlertEnabled) {
      onToggleReplyAlertRef.current(nextReplyAlertEnabled);
    }

    setIsStorageHydrated(true);
    // 초기 localStorage 동기화는 키가 바뀔 때만 수행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosizeStorageKey, replyAlertStorageKey]);

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
      replyAlertStorageKey,
      isReplyAlertEnabled ? "1" : "0",
    );
  }, [replyAlertStorageKey, isReplyAlertEnabled, isStorageHydrated]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setContentTypeClassName(parseContentType(command));
    }, CONTENT_TYPE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [command]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) {
        return;
      }

      if (event.key === autosizeStorageKey) {
        setIsAutosizeEnabled(event.newValue !== "0");
        return;
      }

      if (event.key === replyAlertStorageKey) {
        const nextReplyAlertEnabled = event.newValue !== "0";
        onToggleReplyAlertRef.current(nextReplyAlertEnabled);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [autosizeStorageKey, replyAlertStorageKey]);

  useEffect(() => {
    onAdminModeChange?.(isAdminMenuOpen);
  }, [isAdminMenuOpen, onAdminModeChange]);

  useEffect(() => {
    setThreadTitle(thread.title);
    setThreadIsAdultOnly(thread.isAdultOnly);
    setThreadIsChat(thread.isChat);
    setThreadIsHidden(thread.isHidden);
    setThreadIsSecret(thread.isSecret);
    setAllowOthersReply(!thread.isArchive);
  }, [thread]);

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
      const limitedFiles = allFiles.slice(0, MAX_IMAGE_COUNT);
      syncSelectedImages(limitedFiles);
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

  const clearSelectedImages = useCallback(() => {
    syncSelectedImages([]);
  }, [syncSelectedImages]);

  const handleLoadIdentity = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    setAuthor(
      window.localStorage.getItem(authorStorageKey) ??
        window.localStorage.getItem(PREFS_DEFAULT_AUTHOR) ??
        "",
    );
    setCommand(window.localStorage.getItem(commandStorageKey) ?? "");
    toast.success("작성자 이름/콘솔 명령어를 불러왔습니다.");
  }, [authorStorageKey, commandStorageKey]);

  const handleClearIdentity = useCallback(() => {
    setAuthor("");
    setCommand("");
    if (typeof window !== "undefined") {
      setAuthor("");
      setCommand("");
    }
    toast.success("작성자 이름/콘솔 명령어를 지웠습니다.");
  }, []);

  const handleRepairAa = useCallback(() => {
    const repaired = fixBrokenAa(content);
    setContent(repaired);
    toast.success("깨진 AA를 보정했습니다.");
  }, [content]);

  const handleOpenPreview = useCallback(() => {
    setIsPreviewOpen(true);
  }, []);

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

  const postsForExternalCopy = useMemo(() => {
    if (mode === "all") {
      return posts;
    }

    return posts.filter((post) => post.postOrder !== 0);
  }, [mode, posts]);
  const copyExternalText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildExternalText(postsForExternalCopy));
      toast.success("외부게시용 텍스트를 복사했습니다.");
    } catch {
      toast.error("텍스트 복사에 실패했습니다.");
    }
  }, [postsForExternalCopy]);

  const copyExternalHtml = useCallback(async () => {
    try {
      await copyExternalHtmlToClipboard(thread.title, postsForExternalCopy);
      toast.success("외부게시용 HTML을 복사했습니다.");
    } catch {
      toast.error("HTML 복사에 실패했습니다.");
    }
  }, [postsForExternalCopy, thread.title]);

  const copyExternalImage = useCallback(async () => {
    try {
      const result = await copyExternalImageAsset({
        boardKey,
        threadIndex,
        threadTitle: thread.title,
        posts: postsForExternalCopy,
      });
      if (result === "clipboard") {
        toast.success("외부게시용 이미지를 클립보드에 복사했습니다.");
        return;
      }
      toast.success("이미지를 파일로 저장했습니다.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "UNKNOWN";
      toast.error(`이미지 생성 또는 복사에 실패했습니다. (${reason})`);
    }
  }, [boardKey, postsForExternalCopy, thread.title, threadIndex]);

  const submitCreatePost = async (formData: FormData) => {
    try {
      if (!isSignedIn) {
        toast.error("로그인 후 레스를 작성할 수 있습니다.");
        return;
      }

      const selectedCount = imageInputRef.current?.files?.length ?? 0;
      if (selectedCount > MAX_IMAGE_COUNT) {
        toast.error(
          `이미지는 최대 ${MAX_IMAGE_COUNT}개까지 첨부할 수 있습니다.`,
        );
        return;
      }

      const result = await createPostAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      if (author.trim()) {
        window.localStorage.setItem(authorStorageKey, author.trim());
      }
      window.localStorage.setItem(commandStorageKey, command.trim());

      setContent("");
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
      setSelectedImages([]);
      resizeTextarea();
      contentRef.current?.focus();
      onPostCreated();
      void onRequestRefresh();
    } catch {
      toast.error("요청 처리 중 오류가 발생했습니다.");
    }
  };

  const handleRefresh = useCallback(async () => {
    await onRequestRefresh();
    toast.success("이후 레스을 갱신했습니다.");
  }, [onRequestRefresh]);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (event.shiftKey && key === "a") {
        event.preventDefault();
        setIsAdminMenuOpen((current) => !current);
        return;
      }

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
        void handleRefresh();
        return;
      }

      if (key === "q") {
        event.preventDefault();
        handleToggleCommandToken("aa");
        return;
      }

      if (key === "s") {
        event.preventDefault();
        handleOpenPreview();
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
    isSignedIn,
    handleLoadIdentity,
    handleOpenPreview,
    handleRefresh,
    handleRepairAa,
    handleToggleAutosize,
    handleToggleCommandToken,
  ]);

  const adjustPostLimit = useCallback(
    async (delta: 1000 | -1000) => {
      const formData = new FormData();
      formData.set("boardKey", boardKey);
      formData.set("threadIndex", String(threadIndex));
      formData.set("delta", String(delta));
      const result = await adjustThreadPostLimitAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      if (typeof result.postLimit === "number") {
        onThreadChanged({ postLimit: result.postLimit });
      }
      toast.success(result.message);
    },
    [boardKey, onThreadChanged, threadIndex],
  );

  const saveThreadSettings = useCallback(async () => {
    setIsSavingThread(true);
    try {
      const formData = new FormData();
      formData.set("boardKey", boardKey);
      formData.set("threadIndex", String(threadIndex));
      formData.set("title", threadTitle);
      formData.set("password", threadPassword);
      formData.set("clearPassword", clearPassword ? "1" : "0");
      formData.set("isAdultOnly", threadIsAdultOnly ? "1" : "0");
      formData.set("isChat", threadIsChat ? "1" : "0");
      formData.set("isHidden", threadIsHidden ? "1" : "0");
      formData.set("isSecret", threadIsSecret ? "1" : "0");
      formData.set("allowOthersReply", allowOthersReply ? "1" : "0");
      const result = await updateThreadSettingsAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      if (result.thread) {
        onThreadChanged({
          title: result.thread.title,
          isAdultOnly: result.thread.isAdultOnly,
          isChat: result.thread.isChat,
          isHidden: result.thread.isHidden,
          isSecret: result.thread.isSecret,
          isArchive: !result.thread.allowOthersReply,
        });
      }
      setThreadPassword("");
      setClearPassword(false);
      setIsThreadEditOpen(false);
      toast.success(result.message);
    } finally {
      setIsSavingThread(false);
    }
  }, [
    allowOthersReply,
    boardKey,
    clearPassword,
    threadIsAdultOnly,
    threadIsChat,
    onThreadChanged,
    threadIndex,
    threadIsHidden,
    threadIsSecret,
    threadPassword,
    threadTitle,
  ]);

  const openAutoManagePage = useCallback(() => {
    window.open(
      `/board/${boardKey}/${threadIndex}/auto`,
      "_blank",
      "noopener,noreferrer",
    );
  }, [boardKey, threadIndex]);

  return (
    <>
      <form
        action={submitCreatePost}
        className="rounded-lg border border-sky-200 bg-slate-100 p-4"
      >
        {!isSignedIn ? (
          <p className="my-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            로그인 후 레스를 작성할 수 있습니다.
          </p>
        ) : null}
        <fieldset
          disabled={!isSignedIn}
          className={cn(!isSignedIn ? "cursor-not-allowed opacity-60" : "")}
        >
          <input type="hidden" name="boardKey" value={boardKey} />
          <input type="hidden" name="threadIndex" value={threadIndex} />

          <PostFormControls
            canManageThread={canManageThread}
            isAutosizeEnabled={isAutosizeEnabled}
            isBottomLockEnabled={isBottomLockEnabled}
            isReplyAlertEnabled={isReplyAlertEnabled}
            isAdminMenuOpen={isAdminMenuOpen}
            threadPostLimit={thread.postLimit}
            onRefresh={handleRefresh}
            onLoadIdentity={handleLoadIdentity}
            onClearIdentity={handleClearIdentity}
            onRepairAa={handleRepairAa}
            onToggleAutosize={handleToggleAutosize}
            onOpenPreview={handleOpenPreview}
            onOpenDice={() => {
              setIsDiceOpen(true);
            }}
            onToggleBottomLock={() => {
              onToggleBottomLock(!isBottomLockEnabled);
            }}
            onToggleReplyAlert={() => {
              onToggleReplyAlert(!isReplyAlertEnabled);
            }}
            onToggleAdminMenu={() => {
              setIsAdminMenuOpen((current) => !current);
            }}
            onAdjustPostLimit={adjustPostLimit}
            onCopyExternalText={copyExternalText}
            onCopyExternalHtml={copyExternalHtml}
            onCopyExternalImage={copyExternalImage}
            onOpenThreadSettings={() => {
              setIsThreadEditOpen(true);
            }}
            onOpenAutoManagePage={openAutoManagePage}
          />

          <div className="flex flex-col gap-3">
            <input
              name="author"
              type="text"
              placeholder="이름(60자 이내)"
              value={author}
              onChange={(event) => {
                setAuthor(event.target.value);
              }}
              className="h-11 rounded border border-sky-200 bg-slate-50 px-3 text-[16px] text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
            />
            <input
              name="command"
              type="text"
              placeholder="콘솔 명령어"
              value={command}
              onChange={(event) => {
                setCommand(event.target.value);
              }}
              className="h-11 rounded border border-sky-200 bg-slate-50 px-3 text-[16px] text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <textarea
            ref={contentRef}
            onInput={resizeTextarea}
            name="content"
            placeholder="내용(4만자 이내)"
            rows={6}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
            }}
            className={cn(
              "contentInput mt-3 w-full resize-y rounded border border-sky-200 bg-slate-50 px-3 py-3 text-[16px] leading-relaxed text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none",
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
          />

          <button
            type="submit"
            className="mt-4 h-11 w-full rounded bg-sky-500 text-[20px] font-semibold text-white transition-colors hover:bg-sky-600"
          >
            작성
          </button>
        </fieldset>
      </form>

      {isPreviewOpen ? (
        <PreviewModal
          content={content}
          author={author || AnonymousAuthor}
          command={command}
          onClose={() => {
            setIsPreviewOpen(false);
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

      <ThreadSettingsModal
        isOpen={isThreadEditOpen}
        threadTitle={threadTitle}
        threadPassword={threadPassword}
        clearPassword={clearPassword}
        threadIsAdultOnly={threadIsAdultOnly}
        threadIsChat={threadIsChat}
        threadIsHidden={threadIsHidden}
        threadIsSecret={threadIsSecret}
        allowOthersReply={allowOthersReply}
        isSavingThread={isSavingThread}
        onClose={() => {
          setIsThreadEditOpen(false);
        }}
        onSave={() => {
          void saveThreadSettings();
        }}
        onThreadTitleChange={setThreadTitle}
        onThreadPasswordChange={setThreadPassword}
        onClearPasswordChange={setClearPassword}
        onThreadIsAdultOnlyChange={setThreadIsAdultOnly}
        onThreadIsChatChange={setThreadIsChat}
        onThreadIsHiddenChange={setThreadIsHidden}
        onThreadIsSecretChange={setThreadIsSecret}
        onAllowOthersReplyChange={setAllowOthersReply}
      />
    </>
  );
}
