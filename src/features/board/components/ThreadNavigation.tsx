import Link from "next/link";

import { cn } from "@/lib/cn";

export type ThreadNavigationMode = "recent" | "range" | "all";

interface ThreadNavigationProps {
  boardKey: string;
  threadIndex: number;
  postCount: number;
  mode?: ThreadNavigationMode;
  rangeStart?: number;
  rangeEnd?: number;
}

export function ThreadNavigation({
  boardKey,
  threadIndex,
  postCount,
  mode = "recent",
  rangeStart,
  rangeEnd,
}: ThreadNavigationProps) {
  const safePostCount = Math.max(1, Math.trunc(postCount));
  const basePath = `/board/${boardKey}/${threadIndex}`;
  const recentStart = Math.max(1, safePostCount - 49);

  const visibleStart =
    mode === "range"
      ? Math.min(
          Math.max(1, Math.trunc(rangeStart ?? recentStart)),
          safePostCount,
        )
      : mode === "all"
        ? 1
        : recentStart;
  const visibleEnd =
    mode === "range"
      ? Math.min(
          Math.max(visibleStart, Math.trunc(rangeEnd ?? safePostCount)),
          safePostCount,
        )
      : safePostCount;

  const previousStart = Math.max(1, visibleStart - 50);
  const previousEnd = Math.max(1, visibleStart - 1);
  const nextStart = Math.min(safePostCount, visibleEnd + 1);
  const nextEnd = Math.min(safePostCount, visibleEnd + 50);

  const hasPreviousRange = visibleStart > 1;
  const hasNextRange = visibleEnd < safePostCount;

  const summaryTitle =
    mode === "all" ? "전체 보기" : mode === "range" ? "범위 보기" : "최근 보기";

  const items = [
    {
      label: "이전 보기",
      href: hasPreviousRange
        ? `${basePath}/${previousStart}/${previousEnd}`
        : basePath,
      disabled: !hasPreviousRange,
      active: false,
    },
    {
      label: "다음 보기",
      href: hasNextRange
        ? `${basePath}/${nextStart}/${nextEnd}`
        : `${basePath}/recent`,
      disabled: !hasNextRange,
      active: false,
    },
    {
      label: "최근 보기",
      href: `${basePath}/recent`,
      active: mode === "recent",
    },
    {
      label: "전체 보기",
      href: basePath,
      active: mode === "all",
    },
  ];

  return (
    <div className="mt-4">
      <div className="rounded-2xl border border-sky-200/80 bg-white/78 p-3 shadow-[0_14px_30px_-22px_rgba(14,116,144,0.7)] backdrop-blur-md">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700/80">
              quick navigation
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">
                {summaryTitle}
              </span>
              <span>
                {visibleStart} - {visibleEnd}
              </span>
              <span>총 {safePostCount}개 레스</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            {items.map((item) => {
              if (item.disabled) {
                return (
                  <span
                    key={item.label}
                    className="inline-flex min-w-24 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400"
                    aria-disabled="true"
                  >
                    {item.label}
                  </span>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-w-24 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition-all",
                    item.active
                      ? "border-sky-600 bg-sky-600 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
