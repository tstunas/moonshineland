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
import type { BoardsFilters, BoardsPageData } from "@/features/admin/dashboardDetailData";
import { apiGet, apiPost } from "@/lib/fetch";

const DEFAULT_FILTERS: BoardsFilters = {
  query: "",
  visibility: "all",
  category: "all",
};

export default function BoardsPageClient({ initialData }: { initialData: BoardsPageData }) {
  const [data, setData] = useState(initialData);
  const [draftFilters, setDraftFilters] = useState(initialData.filters);
  const [filters, setFilters] = useState(initialData.filters);
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const firstRenderRef = useRef(true);

  const loadData = async (
    next: Pick<BoardsPageData, "filters" | "page" | "pageSize">,
  ) => {
    const result = await apiGet<BoardsPageData>("/api/admin/dashboard/boards", {
      params: {
        query: next.filters.query,
        visibility: next.filters.visibility,
        category: next.filters.category,
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
        toast.error(result.error ?? "게시판 목록을 불러오지 못했습니다.");
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
    syncUrlState("/dashboard/boards", {
      query: filters.query || undefined,
      visibility: filters.visibility !== "all" ? filters.visibility : undefined,
      category: filters.category !== "all" ? filters.category : undefined,
      page: page > 1 ? page : undefined,
      pageSize: pageSize !== 20 ? pageSize : undefined,
    });
  }, [filters, page, pageSize]);

  const runAction = async (ids: number[], value?: string) => {
    const result = await apiPost<{ summary?: string }>("/api/admin/dashboard/boards", { ids, value });
    if (!result.ok) {
      toast.error(result.error ?? "작업에 실패했습니다.");
      return;
    }

    toast.success(result.data?.summary ?? "변경했습니다.");
    const refreshed = await loadData({ filters, page, pageSize });
    if (!refreshed.ok || !refreshed.data) {
      toast.error(refreshed.error ?? "게시판 목록을 불러오지 못했습니다.");
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
            <h1 className="text-2xl font-black text-slate-900">게시판 상세 관리</h1>
          </div>
          <div className="flex gap-2 text-xs">
            <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">요약 대시보드</Link>
            <Link href="/dashboard/users" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">유저</Link>
            <Link href="/dashboard/threads" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">스레드</Link>
            <Link href="/dashboard/posts" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">레스</Link>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-4">
          <p>전체 게시판: {formatNumber(data.total)}</p>
          <p>조건 일치: {formatNumber(data.filteredTotal)}</p>
          <p>숨김: {formatNumber(data.hiddenCount)}</p>
          <p>아카이브: {formatNumber(data.archiveCount)}</p>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); setPage(1); setFilters(draftFilters); }} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="text" value={draftFilters.query} onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))} placeholder="게시판명/키 검색" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={draftFilters.visibility} onChange={(event) => setDraftFilters((current) => ({ ...current, visibility: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="all">공개: 전체</option>
            <option value="visible">공개: 공개</option>
            <option value="hidden">공개: 숨김</option>
          </select>
          <select value={draftFilters.category} onChange={(event) => setDraftFilters((current) => ({ ...current, category: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="all">분류: 전체</option>
            <option value="basic">분류: 기본판</option>
            <option value="archive">분류: 아카이브</option>
            <option value="adult">분류: 성인전용</option>
          </select>
          <select value={String(pageSize)} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="20">페이지 크기: 20</option>
            <option value="50">페이지 크기: 50</option>
            <option value="100">페이지 크기: 100</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" className="rounded-md border border-sky-700 bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700">적용</button>
            <button type="button" onClick={() => { setDraftFilters(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); setPage(1); setPageSize(20); }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">초기화</button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-700">선택된 게시판 일괄 처리</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => void runAction(selectedIds, "visible")} disabled={selectedIds.length === 0} className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">선택 공개</button>
            <button type="button" onClick={() => void runAction(selectedIds, "hidden")} disabled={selectedIds.length === 0} className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50">선택 숨김</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">선택</th>
                <th className="px-4 py-3">게시판</th>
                <th className="px-4 py-3">속성</th>
                <th className="px-4 py-3">참여/스레드</th>
                <th className="px-4 py-3">생성</th>
                <th className="px-4 py-3">수정</th>
                <th className="px-4 py-3 text-right">개별 작업</th>
              </tr>
            </thead>
            <tbody>
              {data.boards.map((board) => (
                <tr key={board.id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.includes(board.id)} onChange={() => setSelectedIds((current) => current.includes(board.id) ? current.filter((id) => id !== board.id) : [...current, board.id])} className="h-4 w-4" /></td>
                  <td className="px-4 py-3"><Link href={`/board/${board.boardKey}`} className="font-semibold text-slate-900 hover:text-sky-700">{board.name}</Link><p className="text-xs text-slate-500">/{board.boardKey}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{board.description}</p></td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5"><span className={`rounded-full px-2 py-0.5 text-xs ${board.isHidden ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>{board.isHidden ? "숨김" : "공개"}</span>{board.isBasic ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">기본</span> : null}{board.isArchive ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">아카이브</span> : null}{board.isAdultOnly ? <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">성인전용</span> : null}</div></td>
                  <td className="px-4 py-3 text-xs text-slate-500">협업자 {formatNumber(board._count.collaborators)} / 참여 {formatNumber(board._count.joinedUsers)} / 스레드 {formatNumber(board._count.threads)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(board.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(board.updatedAt)}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => void runAction([board.id])} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">{board.isHidden ? "공개" : "숨김"}</button><Link href={`/board/${board.boardKey}`} className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100">이동</Link></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {renderPagination({ page: data.page, totalPages: data.totalPages, onPrev: () => setPage((current) => Math.max(1, current - 1)), onNext: () => setPage((current) => Math.min(data.totalPages, current + 1)) })}
      </section>
    </div>
  );
}