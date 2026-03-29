import Link from "next/link";
import { forbidden } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";

import { getCurrentUser } from "@/features/auth/queries";
import prisma from "@/lib/prisma";
import { buildAuditWhere } from "@/app/(admin)/audits/_lib/auditFilters";
import {
  DashboardSearchParams,
  formatDateTime,
  formatNumber,
  getPageSize,
  parsePositiveInt,
  toPersistentParams,
  toSingleParam,
  buildHref,
} from "@/app/(admin)/dashboard/_lib/pageHelpers";

const PATHNAME = "/audits";
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

async function requireAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isAdmin) {
    forbidden();
  }
}

interface AuditPageProps {
  searchParams: Promise<DashboardSearchParams>;
}

export default async function DashboardAuditsPage({ searchParams }: AuditPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const currentParams = toPersistentParams(params);

  const query = toSingleParam(params.query).trim();
  const targetType = toSingleParam(params.targetType) || "all";
  const action = toSingleParam(params.action).trim();
  const fromDate = toSingleParam(params.fromDate).trim();
  const toDate = toSingleParam(params.toDate).trim();
  const page = parsePositiveInt(toSingleParam(params.page), 1);
  const pageSize = getPageSize(toSingleParam(params.pageSize), 20, [...PAGE_SIZE_OPTIONS]);

  const where: Prisma.AdminAuditLogWhereInput = buildAuditWhere({
    query,
    targetType,
    action,
    fromDate,
    toDate,
  });

  const total = await prisma.adminAuditLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  const logs = await prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
    select: {
      id: true,
      action: true,
      targetType: true,
      targetIds: true,
      summary: true,
      createdAt: true,
      details: true,
      adminUser: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  const prevHref = buildHref(PATHNAME, currentParams, { page: Math.max(1, safePage - 1) });
  const nextHref = buildHref(PATHNAME, currentParams, { page: safePage + 1 });
  const exportHref = buildHref("/audits/export", currentParams, {
    page: undefined,
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

        <div className="mt-3 text-xs text-slate-600">총 로그: {formatNumber(total)}</div>

        <form action={PATHNAME} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="text" name="query" defaultValue={query} placeholder="요약/관리자 검색" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input type="text" name="action" defaultValue={action} placeholder="액션 키 검색" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select name="targetType" defaultValue={targetType} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="all">대상: 전체</option>
            <option value="user">대상: user</option>
            <option value="board">대상: board</option>
            <option value="thread">대상: thread</option>
            <option value="post">대상: post</option>
          </select>
          <input type="date" name="fromDate" defaultValue={fromDate} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input type="date" name="toDate" defaultValue={toDate} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select name="pageSize" defaultValue={String(pageSize)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>페이지 크기: {size}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <input type="hidden" name="page" value="1" />
            <button type="submit" className="rounded-md border border-sky-700 bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700">적용</button>
            <Link href={PATHNAME} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">초기화</Link>
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
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{log.adminUser.username} ({log.adminUser.email})</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-800">{log.action}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{log.targetType}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{JSON.stringify(log.targetIds)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{log.summary}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{log.details ? JSON.stringify(log.details) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <p>페이지 {formatNumber(safePage)} / {formatNumber(totalPages)}</p>
          <div className="flex gap-2">
            {safePage > 1 ? <Link href={prevHref} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100">이전</Link> : <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-slate-400">이전</span>}
            {safePage < totalPages ? <Link href={nextHref} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100">다음</Link> : <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-slate-400">다음</span>}
          </div>
        </div>
      </section>
    </div>
  );
}
