"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
} from "react";

import { cn } from "@/lib/cn";

const FILTER_APPLY_DELAY_MS = 180;
const FILTER_PANEL_COLLAPSED_KEY = "moonshineland:board:filters:collapsed";
const FILTER_INCLUDE_ADULT_ONLY_KEY =
  "moonshineland:board:filters:includeAdultOnly";

type BoardThreadFiltersProps = {
  boardKey: string;
  totalThreads: number;
  title?: string;
  author?: string;
  includeAdultOnly: boolean;
  threadType: "all" | "serial" | "chat";
};

export function BoardThreadFilters({
  boardKey,
  totalThreads,
  title,
  author,
  includeAdultOnly,
  threadType,
}: BoardThreadFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasIncludeAdultOnlyParam = searchParams.has("includeAdultOnly");
  const [titleValue, setTitleValue] = useState(title ?? "");
  const [authorValue, setAuthorValue] = useState(author ?? "");
  const [threadTypeValue, setThreadTypeValue] = useState(threadType);
  const [includeAdultOnlyValue, setIncludeAdultOnlyValue] = useState(() => {
    if (typeof window === "undefined") {
      return includeAdultOnly;
    }

    if (includeAdultOnly) {
      return true;
    }

    return window.localStorage.getItem(FILTER_INCLUDE_ADULT_ONLY_KEY) === "1";
  });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      window.localStorage.getItem(FILTER_PANEL_COLLAPSED_KEY) === "1"
    );
  });
  const deferredTitleValue = useDeferredValue(titleValue);
  const deferredAuthorValue = useDeferredValue(authorValue);

  useEffect(() => {
    setTitleValue(title ?? "");
  }, [title]);

  useEffect(() => {
    setAuthorValue(author ?? "");
  }, [author]);

  useEffect(() => {
    setThreadTypeValue(threadType);
  }, [threadType]);

  useEffect(() => {
    if (!hasIncludeAdultOnlyParam) {
      return;
    }

    setIncludeAdultOnlyValue(includeAdultOnly);
  }, [hasIncludeAdultOnlyParam, includeAdultOnly]);

  useEffect(() => {
    window.localStorage.setItem(
      FILTER_INCLUDE_ADULT_ONLY_KEY,
      includeAdultOnlyValue ? "1" : "0",
    );
  }, [includeAdultOnlyValue]);

  useEffect(() => {
    window.localStorage.setItem(
      FILTER_PANEL_COLLAPSED_KEY,
      isCollapsed ? "1" : "0",
    );
  }, [isCollapsed]);

  const replaceFilters = useCallback((nextValues: {
    title: string;
    author: string;
    threadType: "all" | "serial" | "chat";
    includeAdultOnly: boolean;
  }) => {
    const params = new URLSearchParams();
    const normalizedTitle = nextValues.title.trim();
    const normalizedAuthor = nextValues.author.trim();

    if (nextValues.threadType !== "all") {
      params.set("threadType", nextValues.threadType);
    }

    if (nextValues.includeAdultOnly) {
      params.set("includeAdultOnly", "true");
    }

    if (normalizedTitle) {
      params.set("title", normalizedTitle);
    }

    if (normalizedAuthor) {
      params.set("author", normalizedAuthor);
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery === currentQuery) {
      return;
    }

    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }, [pathname, router, searchParams]);

  function syncFilterState(nextValues: {
    title: string;
    author: string;
    threadType: "all" | "serial" | "chat";
    includeAdultOnly: boolean;
  }) {
    setTitleValue(nextValues.title);
    setAuthorValue(nextValues.author);
    setThreadTypeValue(nextValues.threadType);
    setIncludeAdultOnlyValue(nextValues.includeAdultOnly);
    replaceFilters(nextValues);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      replaceFilters({
        title: deferredTitleValue,
        author: deferredAuthorValue,
        threadType: threadTypeValue,
        includeAdultOnly: includeAdultOnlyValue,
      });
    }, FILTER_APPLY_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    deferredAuthorValue,
    deferredTitleValue,
    includeAdultOnlyValue,
    pathname,
    replaceFilters,
    threadTypeValue,
  ]);

  const activeFilters = [
    {
      key: "thread-type",
      label:
        threadTypeValue === "chat"
          ? "잡담판"
          : threadTypeValue === "serial"
            ? "연재판"
            : "전체",
      tone:
        threadTypeValue === "chat"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : threadTypeValue === "serial"
            ? "border-sky-200 bg-sky-50 text-sky-700"
            : "border-indigo-200 bg-indigo-50 text-indigo-700",
      removable: threadTypeValue !== "all",
      onRemove: () => {
        syncFilterState({
          title: titleValue,
          author: authorValue,
          threadType: "all",
          includeAdultOnly: includeAdultOnlyValue,
        });
      },
    },
    {
      key: "adult",
      label: includeAdultOnlyValue ? "성인 포함" : "성인 제외",
      tone: includeAdultOnlyValue
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700",
      removable: includeAdultOnlyValue,
      onRemove: () => {
        syncFilterState({
          title: titleValue,
          author: authorValue,
          threadType: threadTypeValue,
          includeAdultOnly: false,
        });
      },
    },
    ...(titleValue.trim()
      ? [
          {
            key: "title",
            label: `제목: ${titleValue.trim()}`,
            tone: "border-slate-200 bg-white text-slate-700",
            removable: true,
            onRemove: () => {
              syncFilterState({
                title: "",
                author: authorValue,
                threadType: threadTypeValue,
                includeAdultOnly: includeAdultOnlyValue,
              });
            },
          },
        ]
      : []),
    ...(authorValue.trim()
      ? [
          {
            key: "author",
            label: `작성자: ${authorValue.trim()}`,
            tone: "border-slate-200 bg-white text-slate-700",
            removable: true,
            onRemove: () => {
              syncFilterState({
                title: titleValue,
                author: "",
                threadType: threadTypeValue,
                includeAdultOnly: includeAdultOnlyValue,
              });
            },
          },
        ]
      : []),
  ];

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-sky-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(186,230,253,0.78),_rgba(255,255,255,0.97)_38%,_rgba(236,254,255,0.88)_100%)] p-4 shadow-[0_16px_34px_-30px_rgba(14,116,144,0.4)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300 to-transparent" />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-600">
            Thread Finder
          </p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900">
            스레드 목록 필터
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            현재 조건으로 {totalThreads}개의 스레드를 보고 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600 shadow-sm backdrop-blur">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            입력 후 자동 반영
          </div>
          <button
            type="button"
            aria-expanded={!isCollapsed}
            onClick={() => {
              setIsCollapsed((current) => !current);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-white"
          >
            <span>{isCollapsed ? "필터 펼치기" : "필터 접기"}</span>
            <span
              className={cn(
                "inline-block text-[10px] transition-transform",
                isCollapsed ? "rotate-180" : "rotate-0",
              )}
            >
              ˄
            </span>
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {activeFilters.map((filter) => (
          <span
            key={filter.key}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em]",
              filter.tone,
            )}
          >
            {filter.label}
            {filter.removable ? (
              <button
                type="button"
                aria-label={`${filter.label} 필터 해제`}
                onClick={filter.onRemove}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/5 text-[10px] leading-none transition hover:bg-black/10"
              >
                ×
              </button>
            ) : null}
          </span>
        ))}
      </div>

      {!isCollapsed ? (
        <form
          action={`/board/${boardKey}`}
          method="get"
          className="mt-3 space-y-3"
        >
        <div className="grid gap-2 md:grid-cols-2">
          <label className="block rounded-xl border border-white/80 bg-white/90 px-3 py-2.5 shadow-sm backdrop-blur">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              제목 검색
            </span>
            <input
              name="title"
              type="search"
              value={titleValue}
              onChange={(event) => {
                setTitleValue(event.target.value);
              }}
              placeholder="스레드 제목으로 찾기"
              className="mt-1.5 w-full border-0 bg-transparent p-0 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </label>

          <label className="block rounded-xl border border-white/80 bg-white/90 px-3 py-2.5 shadow-sm backdrop-blur">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              작성자 검색
            </span>
            <input
              name="author"
              type="search"
              value={authorValue}
              onChange={(event) => {
                setAuthorValue(event.target.value);
              }}
              placeholder="작성자 이름으로 찾기"
              className="mt-1.5 w-full border-0 bg-transparent p-0 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </label>
        </div>

        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="rounded-xl border border-white/80 bg-white/90 p-1.5 shadow-sm backdrop-blur">
              <div className="grid grid-cols-3 gap-1.5">
                <label className="cursor-pointer">
                  <input
                    name="threadType"
                    type="radio"
                    value="all"
                    checked={threadTypeValue === "all"}
                    onChange={() => {
                      setThreadTypeValue("all");
                    }}
                    className="peer sr-only"
                  />
                  <span className="flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition peer-checked:border-indigo-500 peer-checked:bg-indigo-500 peer-checked:text-white peer-checked:shadow-sm">
                    전체
                  </span>
                </label>

                <label className="cursor-pointer">
                  <input
                    name="threadType"
                    type="radio"
                    value="serial"
                    checked={threadTypeValue === "serial"}
                    onChange={() => {
                      setThreadTypeValue("serial");
                    }}
                    className="peer sr-only"
                  />
                  <span className="flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition peer-checked:border-sky-500 peer-checked:bg-sky-500 peer-checked:text-white peer-checked:shadow-sm">
                    연재판
                  </span>
                </label>

                <label className="cursor-pointer">
                  <input
                    name="threadType"
                    type="radio"
                    value="chat"
                    checked={threadTypeValue === "chat"}
                    onChange={() => {
                      setThreadTypeValue("chat");
                    }}
                    className="peer sr-only"
                  />
                  <span className="flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition peer-checked:border-amber-500 peer-checked:bg-amber-500 peer-checked:text-white peer-checked:shadow-sm">
                    잡담판
                  </span>
                </label>
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/90 px-3 py-2.5 shadow-sm backdrop-blur md:min-w-64">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  성인 전용 스레드 포함
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  꺼져 있으면 목록에서 제외됩니다.
                </p>
              </div>
              <span className="relative inline-flex shrink-0 items-center">
                <input
                  name="includeAdultOnly"
                  type="checkbox"
                  value="true"
                  checked={includeAdultOnlyValue}
                  onChange={(event) => {
                    setIncludeAdultOnlyValue(event.target.checked);
                  }}
                  className="peer sr-only"
                />
                <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-rose-400" />
                <span className="absolute left-1 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] text-slate-500">
              입력 후 약 {FILTER_APPLY_DELAY_MS}ms 내 자동 반영됩니다.
            </p>
            <Link
              href={`/board/${boardKey}`}
              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              초기화
            </Link>
          </div>
        </div>
        </form>
      ) : null}
    </section>
  );
}