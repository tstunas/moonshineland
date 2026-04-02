"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  renderPagination,
  formatDateTime,
  formatNumber,
  syncUrlState,
} from "../_lib/clientHelpers";
import type { ThreadsFilters, ThreadsPageData } from "@/features/admin/dashboardDetailData";
import { apiGet, apiPost } from "@/lib/fetch";

const DEFAULT_FILTERS: ThreadsFilters = {
  query: "",
  visibility: "all",
  threadType: "all",
  adult: "all",
};

export default function ThreadsPageClient({ initialData }: { initialData: ThreadsPageData }) {
  const [data, setData] = useState(initialData);
  const [draftFilters, setDraftFilters] = useState(initialData.filters);
  const [filters, setFilters] = useState(initialData.filters);
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const firstRenderRef = useRef(true);

  const loadData = async (
    next: Pick<ThreadsPageData, "filters" | "page" | "pageSize">,
  ) => {
    const result = await apiGet<ThreadsPageData>("/api/admin/dashboard/threads", {
      params: {
        query: next.filters.query,
        visibility: next.filters.visibility,
        threadType: next.filters.threadType,
        adult: next.filters.adult,
        page: next.page,
        pageSize: next.pageSize,
      },
    });

    return result;
  };

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    let isCancelled = false;

    const run = async () => {
      const result = await loadData({ filters, page, pageSize });

      if (isCancelled) {
        return;
      }

      if (!result.ok || !result.data) {
        toast.error(result.error ?? "스레드 목록을 불러오지 못했습니다.");
        return;
      }

      setData(result.data);
      setSelectedIds([]);
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [filters, page, pageSize]);

  useEffect(() => {
    syncUrlState("/dashboard/threads", {
      query: filters.query || undefined,
      visibility: filters.visibility !== "all" ? filters.visibility : undefined,
      threadType: filters.threadType !== "all" ? filters.threadType : undefined,
      adult: filters.adult !== "all" ? filters.adult : undefined,
      page: page > 1 ? page : undefined,
      pageSize: pageSize !== 20 ? pageSize : undefined,
    });
  }, [filters, page, pageSize]);

  const runAction = async (ids: number[], value?: string) => {
    const result = await apiPost<{ summary?: string }>("/api/admin/dashboard/threads", { ids, value });
    if (!result.ok) {
      toast.error(result.error ?? "작업에 실패했습니다.");
      return;
    }

    toast.success(result.data?.summary ?? "변경했습니다.");
    const refreshed = await loadData({ filters, page, pageSize });
    if (!refreshed.ok || !refreshed.data) {
      toast.error(refreshed.error ?? "스레드 목록을 불러오지 못했습니다.");
      return;
    }

    setData(refreshed.data);
    setSelectedIds([]);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-sky-700 uppercase">Admin Detail</p>
            <h1 className="text-2xl font-black text-slate-900">스레드 상세 관리</h1>
          </div>
          <div className="flex gap-2 text-xs">
            <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">요약 대시보드</Link>
            <Link href="/dashboard/users" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">유저</Link>
            <Link href="/dashboard/boards" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">게시판</Link>
            <Link href="/dashboard/posts" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">레스</Link>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-4">
          <p>전체 스레드: {formatNumber(data.total)}</p>
          <p>조건 일치: {formatNumber(data.filteredTotal)}</p>
          <p>숨김: {formatNumber(data.hiddenCount)}</p>
          <p>채팅: {formatNumber(data.chatCount)}</p>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); setPage(1); setFilters(draftFilters); }} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input type="text" value={draftFilters.query} onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))} placeholder="제목/작성자/boardKey 검색" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={draftFilters.visibility} onChange={(event) => setDraftFilters((current) => ({ ...current, visibility: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="all">공개: 전체</option><option value="visible">공개: 공개</option><option value="hidden">공개: 숨김</option></select>
          <select value={draftFilters.threadType} onChange={(event) => setDraftFilters((current) => ({ ...current, threadType: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="all">타입: 전체</option><option value="serial">타입: 연재</option><option value="chat">타입: 채팅</option></select>
          <select value={draftFilters.adult} onChange={(event) => setDraftFilters((current) => ({ ...current, adult: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="all">성인: 전체</option><option value="normal">성인: 일반</option><option value="adult">성인: 성인전용</option></select>
          <select value={String(pageSize)} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="20">페이지 크기: 20</option><option value="50">페이지 크기: 50</option><option value="100">페이지 크기: 100</option></select>
          <div className="flex gap-2"><button type="submit" className="rounded-md border border-sky-700 bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700">적용</button><button type="button" onClick={() => { setDraftFilters(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); setPage(1); setPageSize(20); }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">초기화</button></div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-700">선택된 스레드 일괄 처리</p>
          <div className="flex gap-2"><button type="button" onClick={() => void runAction(selectedIds, "visible")} disabled={selectedIds.length === 0} className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">선택 공개</button><button type="button" onClick={() => void runAction(selectedIds, "hidden")} disabled={selectedIds.length === 0} className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50">선택 숨김</button></div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">선택</th><th className="px-4 py-3">스레드</th><th className="px-4 py-3">속성</th><th className="px-4 py-3">레스 현황</th><th className="px-4 py-3">생성</th><th className="px-4 py-3">수정</th><th className="px-4 py-3 text-right">개별 작업</th></tr></thead>
            <tbody>
              {data.threads.map((thread) => {
                const threadHref = `/board/${thread.board.boardKey}/${thread.threadIndex}`;
                return <tr key={thread.id} className="border-t border-slate-200 align-top"><td className="px-4 py-3"><input type="checkbox" checked={selectedIds.includes(thread.id)} onChange={() => setSelectedIds((current) => current.includes(thread.id) ? current.filter((id) => id !== thread.id) : [...current, thread.id])} className="h-4 w-4" /></td><td className="px-4 py-3"><Link href={threadHref} className="font-semibold text-slate-900 hover:text-sky-700">{thread.title}</Link><p className="text-xs text-slate-500">{thread.board.name} / #{thread.threadIndex}</p><p className="text-xs text-slate-500">작성자 {thread.author}</p></td><td className="px-4 py-3"><div className="flex flex-wrap gap-1.5"><span className={`rounded-full px-2 py-0.5 text-xs ${thread.isHidden ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>{thread.isHidden ? "숨김" : "공개"}</span>{thread.isChat ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">채팅</span> : null}{thread.isAdultOnly ? <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">성인전용</span> : null}{thread.isArchive ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">아카이브</span> : null}</div></td><td className="px-4 py-3 text-xs text-slate-500">{formatNumber(thread.postCount)} / 제한 {formatNumber(thread.postLimit)} / 실제 {formatNumber(thread._count.posts)}</td><td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(thread.createdAt)}</td><td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(thread.postUpdatedAt)}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => void runAction([thread.id])} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">{thread.isHidden ? "공개" : "숨김"}</button><Link href={threadHref} className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100">이동</Link></div></td></tr>;
              })}
            </tbody>
          </table>
        </div>

        {renderPagination({ page: data.page, totalPages: data.totalPages, onPrev: () => setPage((current) => Math.max(1, current - 1)), onNext: () => setPage((current) => Math.min(data.totalPages, current + 1)) })}
      </section>
    </div>
  );
}