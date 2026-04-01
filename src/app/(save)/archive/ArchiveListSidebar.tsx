"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ArchiveSidebarItem {
  key: string;
  title: string;
  description: string;
  savedAt: string;
  tags: string[];
  href: string;
  isActive: boolean;
}

type ArchivePaginationItem =
  | {
      type: "ellipsis";
      key: string;
    }
  | {
      type: "page";
      key: string;
      page: number;
      href: string;
      isCurrent: boolean;
    };

interface ArchiveListSidebarProps {
  query: string;
  totalCount: number;
  page: number;
  totalPages: number;
  storageProvider: string;
  items: ArchiveSidebarItem[];
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPageHref: string;
  nextPageHref: string;
  paginationItems: ArchivePaginationItem[];
}

function formatSavedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(text: string, query: string) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return text;
  }

  const escaped = escapeRegExp(normalizedQuery);
  const regex = new RegExp(`(${escaped})`, "ig");
  const parts = text.split(regex);

  if (parts.length <= 1) {
    return text;
  }

  return parts.map((part, index) => {
    if (part.toLowerCase() === normalizedQuery.toLowerCase()) {
      return (
        <mark
          key={`${part}-${String(index)}`}
          className="rounded bg-amber-200/80 px-0.5 text-slate-900"
        >
          {part}
        </mark>
      );
    }

    return <span key={`${part}-${String(index)}`}>{part}</span>;
  });
}

export function ArchiveListSidebar({
  query,
  totalCount,
  page,
  totalPages,
  storageProvider,
  items,
  hasPrevPage,
  hasNextPage,
  prevPageHref,
  nextPageHref,
  paginationItems,
}: ArchiveListSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!isMobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  const sidebarContent = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        Archive List
      </p>
      <h1 className="mt-2 text-2xl font-black text-slate-900">아카이브</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        아카이브는 실시간 CRUD 대상이 아니라, HTML 파일로 고정 저장된 결과를 읽어 옵니다.
      </p>

      <form action="/archive" method="get" className="mt-4 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="제목/태그/설명 검색"
          className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
        />
        <button
          type="submit"
          className="h-10 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          검색
        </button>
      </form>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          결과 {totalCount}건 / 페이지 {page}/{totalPages}
        </span>
        <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-slate-600">
          provider: {storageProvider}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
          표시할 아카이브가 없습니다.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((archive) => (
            <li key={archive.key}>
              <Link
                href={archive.href}
                onClick={() => setIsMobileOpen(false)}
                aria-current={archive.isActive ? "page" : undefined}
                className={[
                  "block rounded-xl border px-3 py-3 transition",
                  archive.isActive
                    ? "border-sky-300 bg-sky-50"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white",
                ].join(" ")}
              >
                <p className="text-sm font-semibold text-slate-900">
                  {renderHighlightedText(archive.title, query)}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {renderHighlightedText(archive.description, query)}
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  저장 시각: {formatSavedAt(archive.savedAt)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {archive.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-600"
                    >
                      {renderHighlightedText(tag, query)}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        {hasPrevPage ? (
          <Link
            href={prevPageHref}
            onClick={() => setIsMobileOpen(false)}
            className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            이전
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-400">
            이전
          </span>
        )}

        <div className="flex items-center gap-1">
          {paginationItems.map((item) => {
            if (item.type === "ellipsis") {
              return (
                <span
                  key={item.key}
                  className="inline-flex h-8 min-w-8 items-center justify-center px-1 text-xs font-semibold text-slate-400"
                >
                  ...
                </span>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                aria-current={item.isCurrent ? "page" : undefined}
                className={[
                  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-semibold transition",
                  item.isCurrent
                    ? "border-sky-300 bg-sky-50 text-sky-800"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                {item.page}
              </Link>
            );
          })}
        </div>

        {hasNextPage ? (
          <Link
            href={nextPageHref}
            onClick={() => setIsMobileOpen(false)}
            className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            다음
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-400">
            다음
          </span>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-800">
            ≡
          </span>
          아카이브 목차 열기
        </button>
      </div>

      <aside className="hidden md:sticky md:top-3 md:block md:h-fit md:w-80">
        {sidebarContent}
      </aside>

      <div
        className={[
          "fixed inset-0 z-40 bg-slate-950/35 transition-opacity md:hidden",
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={() => setIsMobileOpen(false)}
        aria-hidden="true"
      />

      <aside
        aria-label="아카이브 목차"
        className={[
          "fixed inset-y-0 left-0 z-50 w-[min(88vw,22rem)] overflow-y-auto bg-slate-100 p-2 shadow-2xl transition-transform duration-300 md:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="mb-2 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Archive Index
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">목차</p>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            닫기
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  );
}