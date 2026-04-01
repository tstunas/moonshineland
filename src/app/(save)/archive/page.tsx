import type { Metadata } from "next";

import "./archive-viewer.css";
import { ArchiveListSidebar } from "./ArchiveListSidebar";

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

function toPositiveInt(value: string | undefined, fallbackValue = 1): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return parsed;
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

  const sidebarItems = archiveList.items.map((archive) => ({
    key: archive.key,
    title: archive.title,
    description: archive.description,
    savedAt: archive.savedAt,
    tags: archive.tags,
    href: buildArchiveHref({
      key: archive.key,
      query,
      page: archiveList.page,
    }),
    isActive: selectedArchiveKey === archive.key,
  }));

  const paginationItems = pageNumbers.map((token, index) => {
    if (token === "ellipsis") {
      return {
        type: "ellipsis" as const,
        key: `ellipsis-${String(index)}`,
      };
    }

    return {
      type: "page" as const,
      key: `page-${String(token)}`,
      page: token,
      href: buildArchiveHref({
        key: selectedArchiveKey ?? undefined,
        query,
        page: token,
      }),
      isCurrent: token === archiveList.page,
    };
  });

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 px-2 py-2 md:flex-row md:gap-6">
      <ArchiveListSidebar
        query={archiveList.query}
        totalCount={archiveList.totalCount}
        page={archiveList.page}
        totalPages={archiveList.totalPages}
        storageProvider={archiveList.storageProvider}
        items={sidebarItems}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        prevPageHref={prevPageHref}
        nextPageHref={nextPageHref}
        paginationItems={paginationItems}
      />

      <main className="min-w-0 flex-1">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 rounded-2xl border border-amber-300 bg-[linear-gradient(135deg,rgba(254,243,199,0.92),rgba(255,251,235,0.98))] px-4 py-3 text-amber-950 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">
              Preview Only
            </p>
            <h1 className="mt-1 text-lg font-black text-amber-950 sm:text-xl">
              아직 정식 지원하지 않는 기능이며, 현재 화면은 모의 페이지입니다.
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-amber-900/90">
              실제 아카이브 운영 흐름을 확정하기 전의 탐색용 UI입니다. 검색, 목차 이동, HTML 뷰어 구성이 바뀔 수 있습니다.
            </p>
          </div>

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
