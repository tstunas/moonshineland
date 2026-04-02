"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  renderPagination,
  formatDateTime,
  formatNumber,
  syncUrlState,
} from "../_lib/clientHelpers";
import type { UsersFilters, UsersPageData } from "@/features/admin/dashboardDetailData";
import { apiGet, apiPost } from "@/lib/fetch";

interface UsersPageClientProps {
  initialData: UsersPageData;
  currentAdminId: number;
}

interface ActionResponse {
  summary?: string;
}

function parseMaybeDate(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPermanentSuspension(until: Date): boolean {
  return until.getUTCFullYear() >= 9999;
}

const DEFAULT_FILTERS: UsersFilters = {
  query: "",
  status: "all",
  role: "all",
  suspension: "all",
};

export default function UsersPageClient({ initialData, currentAdminId }: UsersPageClientProps) {
  const [data, setData] = useState(initialData);
  const [draftFilters, setDraftFilters] = useState(initialData.filters);
  const [filters, setFilters] = useState(initialData.filters);
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [suspendDate, setSuspendDate] = useState<string>(
    () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [isLoading, setIsLoading] = useState(false);
  const firstRenderRef = useRef(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await apiGet<UsersPageData>("/api/admin/dashboard/users", {
      params: {
        query: filters.query,
        status: filters.status,
        role: filters.role,
        suspension: filters.suspension,
        page,
        pageSize,
      },
    });
    setIsLoading(false);

    if (!result.ok || !result.data) {
      toast.error(result.error ?? "유저 목록을 불러오지 못했습니다.");
      return;
    }

    setData(result.data);
    setSelectedIds([]);
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
    syncUrlState("/dashboard/users", {
      query: filters.query || undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      role: filters.role !== "all" ? filters.role : undefined,
      suspension: filters.suspension !== "all" ? filters.suspension : undefined,
      page: page > 1 ? page : undefined,
      pageSize: pageSize !== 20 ? pageSize : undefined,
    });
  }, [filters, page, pageSize]);

  const toggleSelection = (userId: number) => {
    setSelectedIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const runAction = async (payload: {
    action: "active" | "admin" | "suspend";
    ids: number[];
    value?: string;
    suspendedUntil?: string;
  }) => {
    const result = await apiPost<ActionResponse>("/api/admin/dashboard/users", payload);
    if (!result.ok) {
      toast.error(result.error ?? "작업에 실패했습니다.");
      return;
    }

    toast.success(result.data?.summary ?? "변경했습니다.");
    await fetchData();
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-sky-700 uppercase">Admin Detail</p>
            <h1 className="text-2xl font-black text-slate-900">유저 상세 관리</h1>
          </div>
          <div className="flex gap-2 text-xs">
            <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">요약 대시보드</Link>
            <Link href="/dashboard/boards" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">게시판</Link>
            <Link href="/dashboard/threads" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">스레드</Link>
            <Link href="/dashboard/posts" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">레스</Link>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-4">
          <p>전체 유저: {formatNumber(data.total)}</p>
          <p>조건 일치: {formatNumber(data.filteredTotal)}</p>
          <p>활성: {formatNumber(data.activeCount)}</p>
          <p>관리자: {formatNumber(data.adminCount)}</p>
          <p>정지 중: {formatNumber(data.suspendedCount)}</p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setFilters(draftFilters);
          }}
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
        >
          <input
            type="text"
            value={draftFilters.query}
            onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="닉네임/이메일 검색"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={draftFilters.status}
            onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">상태: 전체</option>
            <option value="active">상태: 활성</option>
            <option value="inactive">상태: 비활성</option>
          </select>
          <select
            value={draftFilters.role}
            onChange={(event) => setDraftFilters((current) => ({ ...current, role: event.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">권한: 전체</option>
            <option value="admin">권한: 관리자</option>
            <option value="user">권한: 일반</option>
          </select>
          <select
            value={draftFilters.suspension}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                suspension: event.target.value,
              }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">정지: 전체</option>
            <option value="normal">정지: 정상</option>
            <option value="suspended">정지: 정지중</option>
            <option value="temporary">정지: 기간</option>
            <option value="permanent">정지: 영구</option>
          </select>
          <select
            value={String(pageSize)}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="20">페이지 크기: 20</option>
            <option value="50">페이지 크기: 50</option>
            <option value="100">페이지 크기: 100</option>
          </select>
          <div className="flex gap-2">
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
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-700">선택된 유저 일괄 상태 변경</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void runAction({ action: "active", ids: selectedIds, value: "active" })} disabled={selectedIds.length === 0 || isLoading} className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">일괄 활성화</button>
            <button type="button" onClick={() => void runAction({ action: "active", ids: selectedIds, value: "inactive" })} disabled={selectedIds.length === 0 || isLoading} className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50">일괄 비활성화</button>
            <button type="button" onClick={() => void runAction({ action: "admin", ids: selectedIds, value: "admin" })} disabled={selectedIds.length === 0 || isLoading} className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50">일괄 관리자 지정</button>
            <button type="button" onClick={() => void runAction({ action: "admin", ids: selectedIds, value: "user" })} disabled={selectedIds.length === 0 || isLoading} className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">일괄 관리자 해제</button>
            <button type="button" onClick={() => void runAction({ action: "suspend", ids: selectedIds, value: "permanent" })} disabled={selectedIds.length === 0 || isLoading} className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">일괄 영구 정지</button>
            <input
              type="date"
              value={suspendDate}
              onChange={(event) => setSuspendDate(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700"
            />
            <button
              type="button"
              onClick={() => {
                if (!suspendDate) {
                  toast.error("기간 정지 날짜를 선택해주세요.");
                  return;
                }
                void runAction({
                  action: "suspend",
                  ids: selectedIds,
                  value: "until",
                  suspendedUntil: suspendDate,
                });
              }}
              disabled={selectedIds.length === 0 || isLoading}
              className="rounded-md border border-orange-300 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50"
            >
              일괄 기간 정지
            </button>
            <button type="button" onClick={() => void runAction({ action: "suspend", ids: selectedIds, value: "clear" })} disabled={selectedIds.length === 0 || isLoading} className="rounded-md border border-teal-300 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-50">일괄 정지 해제</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">선택</th>
                <th className="px-4 py-3">유저</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">작성</th>
                <th className="px-4 py-3">가입</th>
                <th className="px-4 py-3">최근 수정</th>
                <th className="px-4 py-3 text-right">개별 작업</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.includes(user.id)} onChange={() => toggleSelection(user.id)} className="h-4 w-4" />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{user.username}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const suspendedUntil = parseMaybeDate(user.suspendedUntil);
                      const isSuspended = Boolean(suspendedUntil && suspendedUntil.getTime() > Date.now());

                      return (
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${user.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{user.isActive ? "활성" : "비활성"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${user.isAdmin ? "bg-sky-100 text-sky-800" : "bg-slate-200 text-slate-700"}`}>{user.isAdmin ? "관리자" : "일반"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${user.isAdultVerified ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"}`}>{user.isAdultVerified ? "성인인증" : "미인증"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${isSuspended ? "bg-red-100 text-red-800" : "bg-slate-200 text-slate-700"}`}>
                        {isSuspended
                          ? isPermanentSuspension(suspendedUntil as Date)
                            ? "영구 정지"
                            : `기간 정지 ~ ${formatDateTime(suspendedUntil as Date)}`
                          : "정상"}
                      </span>
                    </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">게시글 {formatNumber(user._count.posts)} / 스레드 {formatNumber(user._count.threadsOwned)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(user.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(user.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => void runAction({ action: "active", ids: [user.id] })} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">{user.isActive ? "비활성" : "활성"}</button>
                      <button type="button" onClick={() => void runAction({ action: "admin", ids: [user.id] })} disabled={user.id === currentAdminId && user.isAdmin} className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50">{user.isAdmin ? "관리자 해제" : "관리자 지정"}</button>
                    </div>
                  </td>
                </tr>
              ))}
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