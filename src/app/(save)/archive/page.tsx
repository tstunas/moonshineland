import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./archive-viewer.css";

import {
  getArchiveListAction,
} from "@/features/archive/actions/getArchiveListAction";
import { getArchiveHtmlAction } from "@/features/archive/actions/getArchiveHtmlAction";

export const metadata: Metadata = {
  title: "문샤인랜드: 아카이브",
};

interface ArchivePageProps {
  searchParams?: Promise<{
    key?: string;
    q?: string;
    page?: string;
  }>;
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
  }).format(date);
}

function toPositiveInt(value: string | undefined, fallbackValue = 1): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return parsed;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(text: string, query: string): ReactNode {
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

type PaginationToken = number | "ellipsis";

function buildPageNumbers(currentPage: number, totalPages: number): PaginationToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sortedPages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const tokens: PaginationToken[] = [];

  sortedPages.forEach((page, index) => {
    if (index > 0) {
      const prevPage = sortedPages[index - 1];
      if (page - prevPage > 1) {
        tokens.push("ellipsis");
      }
    }

    tokens.push(page);
  });

  return tokens;
}

function buildArchiveHref(options: {
  key?: string;
  query?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  const query = (options.query ?? "").trim();
  if (query) {
    params.set("q", query);
  }

  if (options.page && options.page > 1) {
    params.set("page", String(options.page));
  }

  if (options.key) {
    params.set("key", options.key);
  }

  const queryString = params.toString();
  return queryString ? `/archive?${queryString}` : "/archive";
}

function resolveSelectedArchiveKey(
  selectedKey: string | undefined,
  firstItemKey: string | undefined,
) {
  if (selectedKey?.trim()) {
    return selectedKey;
  }

  if (firstItemKey) {
    return firstItemKey;
  }

  return null;
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const params = (await searchParams) ?? {};
  const query = (params.q ?? "").trim();
  const page = toPositiveInt(params.page, 1);

  const archiveList = await getArchiveListAction({
    query,
    page,
    pageSize: 6,
  });

  const selectedArchiveKey = resolveSelectedArchiveKey(
    params.key,
    archiveList.items[0]?.key,
  );

  const selectedArchive = archiveList.items.find(
    (item) => item.key === selectedArchiveKey,
  );

  const archiveHtmlResult = selectedArchiveKey
    ? await getArchiveHtmlAction(selectedArchiveKey)
    : { success: false, html: "", message: "아카이브가 없습니다." };

  const hasPrevPage = archiveList.page > 1;
  const hasNextPage = archiveList.page < archiveList.totalPages;
  const pageNumbers = buildPageNumbers(archiveList.page, archiveList.totalPages);

  const prevPageHref = buildArchiveHref({
    key: selectedArchiveKey ?? undefined,
    query,
    page: archiveList.page - 1,
  });
  const nextPageHref = buildArchiveHref({
    key: selectedArchiveKey ?? undefined,
    query,
    page: archiveList.page + 1,
  });

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 px-2 py-2 md:flex-row md:gap-6">
      <aside className="md:sticky md:top-3 md:h-fit md:w-80">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-500 uppercase">
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
              defaultValue={archiveList.query}
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
              결과 {archiveList.totalCount}건 / 페이지 {archiveList.page}/{archiveList.totalPages}
            </span>
            <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-slate-600">
              provider: {archiveList.storageProvider}
            </span>
          </div>

          {archiveList.items.length === 0 ? (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
              표시할 아카이브가 없습니다.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {archiveList.items.map((archive) => {
                const isActive = selectedArchiveKey === archive.key;

                return (
                  <li key={archive.key}>
                    <Link
                      href={buildArchiveHref({
                        key: archive.key,
                        query,
                        page: archiveList.page,
                      })}
                      aria-current={isActive ? "page" : undefined}
                      className={[
                        "block rounded-xl border px-3 py-3 transition",
                        isActive
                          ? "border-sky-300 bg-sky-50"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white",
                      ].join(" ")}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {renderHighlightedText(archive.title, archiveList.query)}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {renderHighlightedText(archive.description, archiveList.query)}
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
                            {renderHighlightedText(tag, archiveList.query)}
                          </span>
                        ))}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            {hasPrevPage ? (
              <Link
                href={prevPageHref}
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
              {pageNumbers.map((token, index) => {
                if (token === "ellipsis") {
                  return (
                    <span
                      key={`ellipsis-${String(index)}`}
                      className="inline-flex h-8 min-w-8 items-center justify-center px-1 text-xs font-semibold text-slate-400"
                    >
                      ...
                    </span>
                  );
                }

                const isCurrentPage = token === archiveList.page;

                return (
                  <Link
                    key={token}
                    href={buildArchiveHref({
                      key: selectedArchiveKey ?? undefined,
                      query,
                      page: token,
                    })}
                    aria-current={isCurrentPage ? "page" : undefined}
                    className={[
                      "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-semibold transition",
                      isCurrentPage
                        ? "border-sky-300 bg-sky-50 text-sky-800"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {token}
                  </Link>
                );
              })}
            </div>

            {hasNextPage ? (
              <Link
                href={nextPageHref}
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
      </aside>

      <main className="min-w-0 flex-1">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <header className="border-b border-slate-200 pb-4">
            <p className="text-xs font-semibold tracking-[0.22em] text-sky-700 uppercase">
              Html Snapshot Viewer
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
              {selectedArchive?.title ?? selectedArchiveKey ?? "아카이브 미리보기"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              현재 화면은 서버 액션으로 가져온 HTML 스냅샷을 렌더링하고 있습니다.
            </p>
          </header>

          {archiveHtmlResult.success ? (
            <div
              className="archive-viewer content mt-5 text-[15px] leading-7 text-slate-800"
              dangerouslySetInnerHTML={{ __html: archiveHtmlResult.html }}
            />
          ) : (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {archiveHtmlResult.message ?? "아카이브 HTML을 불러오지 못했습니다."}
            </div>
          )}
        </article>
      </main>
    </div>
  );
}
