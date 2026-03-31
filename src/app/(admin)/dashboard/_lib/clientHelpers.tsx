import type { MouseEventHandler } from "react";

export function buildClientHref(
  pathname: string,
  params: Record<string, string | number | undefined>,
): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function syncUrlState(
  pathname: string,
  params: Record<string, string | number | undefined>,
) {
  if (typeof window === "undefined") {
    return;
  }

  const href = buildClientHref(pathname, params);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === href) {
    return;
  }

  window.history.replaceState(window.history.state, "", href);
}

export function formatDateTime(value: Date | string): string {
  return new Date(value).toLocaleString("ko-KR", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPrev: MouseEventHandler<HTMLButtonElement>;
  onNext: MouseEventHandler<HTMLButtonElement>;
}

export function renderPagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
      <p>
        페이지 {formatNumber(page)} / {formatNumber(totalPages)}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <button
            type="button"
            onClick={onPrev}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            이전
          </button>
        ) : (
          <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-slate-400">
            이전
          </span>
        )}

        {page < totalPages ? (
          <button
            type="button"
            onClick={onNext}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            다음
          </button>
        ) : (
          <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-slate-400">
            다음
          </span>
        )}
      </div>
    </div>
  );
}