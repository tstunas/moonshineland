"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createThreadAction } from "@/features/board/actions/thread/createThreadAction";
import { cn } from "@/lib/cn";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AnonymousAuthor } from "@/lib/constants";

import { DiceModal } from "./DiceModal";
import { PostImagePicker } from "./PostImagePicker";
import { PreviewModal } from "./PreviewModal";
import { ThreadFormControls } from "./ThreadFormControls";

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

export function ThreadForm({
  boardKey,
  threadIndex,
}: {
  boardKey: string;
  threadIndex: number;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputId = `thread-image-${boardKey}-${threadIndex}`;
  const authorStorageKey = `moonshineland:form:${boardKey}:author`;
  const commandStorageKey = `moonshineland:form:${boardKey}:command`;
  const autosizeStorageKey = `moonshineland:form:${boardKey}:thread-autosize`;

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [command, setCommand] = useState("");
  const [contentTypeClassName, setContentTypeClassName] =
    useState<ParsedContentType>("text");
  const [content, setContent] = useState("");
  const [isAdultOnly, setIsAdultOnly] = useState(false);
  const [isChat, setIsChat] = useState(false);
  const [isAutosizeEnabled, setIsAutosizeEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(autosizeStorageKey) !== "0";
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDiceOpen, setIsDiceOpen] = useState(false);

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
    window.localStorage.setItem(
      autosizeStorageKey,
      isAutosizeEnabled ? "1" : "0",
    );
  }, [autosizeStorageKey, isAutosizeEnabled]);

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

  const handleRefresh = useCallback(() => {
    router.refresh();
    toast.success("현재 페이지를 갱신했습니다.");
  }, [router]);

  const handleLoadIdentity = useCallback(() => {
    setAuthor(window.localStorage.getItem(authorStorageKey) ?? "");
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
    setContent((current) => fixBrokenAa(current));
    toast.success("깨진 AA를 보정했습니다.");
  }, []);

  const handleOpenPreview = useCallback(() => {
    setIsPreviewOpen(true);
  }, []);

  const handleToggleAutosize = useCallback(() => {
    setIsAutosizeEnabled((current) => !current);
  }, []);

  const handleToggleCommandToken = useCallback((token: "aa" | "relay") => {
    setCommand((current) => toggleCommandToken(current, token));
  }, []);

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
        handleToggleCommandToken("relay");
        return;
      }

      if (event.shiftKey) {
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
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    handleLoadIdentity,
    handleOpenPreview,
    handleRepairAa,
    handleToggleAutosize,
    handleToggleCommandToken,
  ]);

  const submitCreateThread = async (formData: FormData) => {
    try {
      const selectedCount = imageInputRef.current?.files?.length ?? 0;
      if (selectedCount > MAX_IMAGE_COUNT) {
        toast.error(
          `이미지는 최대 ${MAX_IMAGE_COUNT}개까지 첨부할 수 있습니다.`,
        );
        return;
      }

      const result = await createThreadAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      window.localStorage.setItem(authorStorageKey, author.trim());
      window.localStorage.setItem(commandStorageKey, command.trim());

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("page");
      nextParams.delete("title");
      nextParams.delete("author");

      const basePath = `/board/${boardKey}`;
      const nextUrl =
        nextParams.size > 0 ? `${basePath}?${nextParams.toString()}` : basePath;

      toast.success(result.message);
      window.setTimeout(() => {
        window.location.assign(nextUrl);
      }, 300);
    } catch {
      toast.error("요청 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <>
      <form
        action={submitCreateThread}
        className="rounded-lg border border-sky-200 bg-slate-100 p-4"
      >
        <input type="hidden" name="boardKey" value={boardKey} />
        <input type="hidden" name="threadIndex" value={threadIndex} />

        <ThreadFormControls
          isAutosizeEnabled={isAutosizeEnabled}
          onRefresh={handleRefresh}
          onLoadIdentity={handleLoadIdentity}
          onClearIdentity={handleClearIdentity}
          onToggleAutosize={handleToggleAutosize}
          onRepairAa={handleRepairAa}
          onOpenPreview={handleOpenPreview}
          onOpenDice={() => {
            setIsDiceOpen(true);
          }}
        />

        <div className="flex flex-col gap-3">
          <div className="grid gap-2 rounded-2xl border border-sky-200 bg-[linear-gradient(180deg,_rgba(240,249,255,1),_rgba(248,250,252,1))] p-3 text-[15px] text-slate-700 sm:grid-cols-2">
            <label
              className={cn(
                "cursor-pointer rounded-xl border px-4 py-3 transition",
                isAdultOnly
                  ? "border-rose-300 bg-rose-50 text-rose-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50/50",
              )}
            >
              <input
                name="isAdultOnly"
                type="checkbox"
                value="true"
                checked={isAdultOnly}
                onChange={(event) => {
                  setIsAdultOnly(event.target.checked);
                }}
                className="sr-only"
              />
              <span className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-semibold">성인만</span>
                  <span className="mt-0.5 block text-xs opacity-80">
                    성인 전용 스레드로 등록합니다.
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
                "cursor-pointer rounded-xl border px-4 py-3 transition",
                isChat
                  ? "border-amber-300 bg-amber-50 text-amber-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50/50",
              )}
            >
              <input
                name="isChat"
                type="checkbox"
                value="true"
                checked={isChat}
                onChange={(event) => {
                  setIsChat(event.target.checked);
                }}
                className="sr-only"
              />
              <span className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-semibold">잡담판</span>
                  <span className="mt-0.5 block text-xs opacity-80">
                    연재판 대신 자유 대화 스레드로 등록합니다.
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex h-6 w-11 rounded-full p-0.5 transition",
                    isChat ? "bg-amber-400" : "bg-slate-300",
                  )}
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded-full bg-white shadow-sm transition",
                      isChat ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </span>
              </span>
            </label>
          </div>
          <input
            name="title"
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            className="h-11 rounded border border-sky-200 bg-slate-50 px-3 text-[16px] text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
          />
          <input
            name="author"
            type="text"
            placeholder="이름을 입력하세요"
            value={author}
            onChange={(event) => {
              setAuthor(event.target.value);
            }}
            className="h-11 rounded border border-sky-200 bg-slate-50 px-3 text-[16px] text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
          />
          <input
            name="command"
            type="text"
            placeholder="콘솔 명령어를 입력하세요"
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
          placeholder="내용을 입력하세요"
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
      </form>

      {isPreviewOpen ? (
        <PreviewModal
          modalTitle="스레드 미리보기"
          titleLine={`${[isAdultOnly ? "[성인만]" : null, isChat ? "[잡담판]" : null, `#${threadIndex}`]
            .filter(Boolean)
            .join(" ")} ${title || "(제목 없음)"}`}
          subLine={`${author || AnonymousAuthor}${command ? ` (${command})` : ""}`}
          content={content}
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
    </>
  );
}
