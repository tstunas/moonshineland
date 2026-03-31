"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  buildClientHref,
  formatDateTime,
  formatNumber,
  renderPagination,
  syncUrlState,
} from "@/app/(admin)/dashboard/_lib/clientHelpers";
import {
  AUDIT_PAGE_SIZE_OPTIONS,
  type AuditFilters,
  type AuditsPageData,
} from "@/features/admin/auditPageData";
import { apiGet } from "@/lib/fetch";

const PATHNAME = "/audits";
const EXPORT_PATHNAME = "/audits/export";

const DEFAULT_FILTERS: AuditFilters = {
  query: "",
  targetType: "all",
  action: "",
  fromDate: "",
  toDate: "",
};

export default function AuditsPageClient({ initialData }: { initialData: AuditsPageData }) {
  const [data, setData] = useState(initialData);
  const [draftFilters, setDraftFilters] = useState(initialData.filters);
  const [filters, setFilters] = useState(initialData.filters);
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [isLoading, setIsLoading] = useState(false);
  const firstRenderRef = useRef(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await apiGet<AuditsPageData>("/api/admin/audits", {
      params: {
        query: filters.query,
        targetType: filters.targetType,
        action: filters.action,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        page,
        pageSize,
      },
    });
    setIsLoading(false);

    if (!result.ok || !result.data) {
      toast.error(result.error ?? "감사 로그를 불러오지 못했습니다.");
      return;
    }

    setData(result.data);
  }, [filters, page, pageSize]);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchData]);

  useEffect(() => {
    syncUrlState(PATHNAME, {
      query: filters.query || undefined,
      targetType: filters.targetType !== "all" ? filters.targetType : undefined,
      action: filters.action || undefined,
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      page: page > 1 ? page : undefined,
      pageSize: pageSize !== 20 ? pageSize : undefined,
    });
  }, [filters, page, pageSize]);

  const exportHref = buildClientHref(EXPORT_PATHNAME, {
    query: filters.query || undefined,
    targetType: filters.targetType !== "all" ? filters.targetType : undefined,
    action: filters.action || undefined,
    fromDate: filters.fromDate || undefined,
    toDate: filters.toDate || undefined,
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-sky-700 uppercase">Admin Detail</p>
            <h1 className="text-2xl font-black text-slate-900">작업 감사 로그</h1>
          </div>
          <div className="flex gap-2 text-xs">
            <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">요약 대시보드</Link>
            <Link href="/dashboard/users" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">유저</Link>
            <Link href="/dashboard/boards" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">게시판</Link>
            <Link href="/dashboard/threads" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">스레드</Link>
            <Link href="/dashboard/posts" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">레스</Link>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <p>총 로그: {formatNumber(data.total)}</p>
          {isLoading ? <p className="font-semibold text-sky-700">불러오는 중...</p> : null}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setFilters(draftFilters);
          }}
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <input
            type="text"
            value={draftFilters.query}
            onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="요약/관리자 검색"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={draftFilters.action}
            onChange={(event) => setDraftFilters((current) => ({ ...current, action: event.target.value }))}
            placeholder="액션 키 검색"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={draftFilters.targetType}
            onChange={(event) => setDraftFilters((current) => ({ ...current, targetType: event.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">대상: 전체</option>
            <option value="user">대상: user</option>
            <option value="board">대상: board</option>
            <option value="thread">대상: thread</option>
            <option value="post">대상: post</option>
          </select>
          <input
            type="date"
            value={draftFilters.fromDate}
            onChange={(event) => setDraftFilters((current) => ({ ...current, fromDate: event.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={draftFilters.toDate}
            onChange={(event) => setDraftFilters((current) => ({ ...current, toDate: event.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={String(pageSize)}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {AUDIT_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>페이지 크기: {size}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <button type="submit" className="rounded-md border border-sky-700 bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700">적용</button>
            <button
              type="button"
              onClick={() => {
                setDraftFilters(DEFAULT_FILTERS);
                setFilters(DEFAULT_FILTERS);
                setPage(1);
                setPageSize(20);
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              초기화
            </button>
            <Link href={exportHref} className="rounded-md border border-emerald-400 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">CSV 내보내기</Link>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">시각</th>
                <th className="px-4 py-3">관리자</th>
                <th className="px-4 py-3">액션</th>
                <th className="px-4 py-3">대상</th>
                <th className="px-4 py-3">대상 ID</th>
                <th className="px-4 py-3">요약</th>
                <th className="px-4 py-3">세부정보</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.length > 0 ? (
                data.logs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-200 align-top">
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(log.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{log.adminUser.username} ({log.adminUser.email})</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800">{log.action}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{log.targetType}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{JSON.stringify(log.targetIds)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{log.summary}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{log.details ? JSON.stringify(log.details) : "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    조건에 맞는 감사 로그가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {renderPagination({
          page: data.page,
          totalPages: data.totalPages,
          onPrev: () => setPage((current) => Math.max(1, current - 1)),
          onNext: () => setPage((current) => Math.min(data.totalPages, current + 1)),
        })}
      </section>
    </div>
  );
}