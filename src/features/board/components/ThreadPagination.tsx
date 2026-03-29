import Link from "next/link";
import { cn } from "@/lib/cn";

type ThreadPaginationProps = {
  totalPages: number;
  currentPage: number;
  basePath: string;
  queryKey?: string;
  extraQuery?: Record<string, string>;
};

export function ThreadPagination({
  totalPages,
  currentPage,
  basePath,
  queryKey = "page",
  extraQuery,
}: ThreadPaginationProps) {
  const safeTotalPages = Math.max(1, Math.trunc(totalPages));
  const safeCurrentPage = Math.min(
    Math.max(1, Math.trunc(currentPage)),
    safeTotalPages,
  );

  const desktopVisiblePages = getVisiblePages(
    safeCurrentPage,
    safeTotalPages,
    2,
  );
  const mobileVisiblePages = getVisiblePages(
    safeCurrentPage,
    safeTotalPages,
    1,
  );

  return (
    <nav
      className="flex flex-wrap items-center gap-2"
      aria-label="스레드 페이지네이션"
    >
      <Link
        href={createPageHref(
          basePath,
          Math.max(1, safeCurrentPage - 1),
          queryKey,
          extraQuery,
        )}
        aria-disabled={safeCurrentPage <= 1}
        tabIndex={safeCurrentPage <= 1 ? -1 : undefined}
        className={cn(
          "rounded border px-3 py-1.5 text-sm transition-colors",
          safeCurrentPage <= 1
            ? "pointer-events-none cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        )}
      >
        이전
      </Link>

      <div className="contents md:hidden">
        <PageItems
          items={mobileVisiblePages}
          currentPage={safeCurrentPage}
          basePath={basePath}
          queryKey={queryKey}
          extraQuery={extraQuery}
        />
      </div>

      <div className="hidden md:contents">
        <PageItems
          items={desktopVisiblePages}
          currentPage={safeCurrentPage}
          basePath={basePath}
          queryKey={queryKey}
          extraQuery={extraQuery}
        />
      </div>

      <Link
        href={createPageHref(
          basePath,
          Math.min(safeTotalPages, safeCurrentPage + 1),
          queryKey,
          extraQuery,
        )}
        aria-disabled={safeCurrentPage >= safeTotalPages}
        tabIndex={safeCurrentPage >= safeTotalPages ? -1 : undefined}
        className={cn(
          "rounded border px-3 py-1.5 text-sm transition-colors",
          safeCurrentPage >= safeTotalPages
            ? "pointer-events-none cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        )}
      >
        다음
      </Link>
    </nav>
  );
}

function PageItems({
  items,
  currentPage,
  basePath,
  queryKey,
  extraQuery,
}: {
  items: Array<number | "ellipsis">;
  currentPage: number;
  basePath: string;
  queryKey: string;
  extraQuery?: Record<string, string>;
}) {
  return (
    <>
      {items.map((item, index) => {
        if (item === "ellipsis") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="px-1 text-sm text-slate-500"
              aria-hidden="true"
            >
              ...
            </span>
          );
        }

        const isActive = item === currentPage;
        return (
          <Link
            key={item}
            href={createPageHref(basePath, item, queryKey, extraQuery)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-w-9 items-center justify-center rounded border px-2.5 py-1.5 text-sm transition-colors",
              isActive
                ? "border-sky-700 bg-sky-700 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            {item}
          </Link>
        );
      })}
    </>
  );
}

function createPageHref(
  basePath: string,
  page: number,
  queryKey: string,
  extraQuery?: Record<string, string>,
): string {
  const params = new URLSearchParams(extraQuery ?? {});

  if (page > 1) {
    params.set(queryKey, String(page));
  }

  if (params.size === 0) {
    return basePath;
  }

  return `${basePath}?${params.toString()}`;
}

function getVisiblePages(
  currentPage: number,
  totalPages: number,
  siblingCount: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 1) {
    return [1];
  }

  const start = Math.max(2, currentPage - siblingCount);
  const end = Math.min(totalPages - 1, currentPage + siblingCount);

  const items: Array<number | "ellipsis"> = [1];

  if (start > 2) {
    items.push("ellipsis");
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis");
  }

  items.push(totalPages);

  return items;
}
