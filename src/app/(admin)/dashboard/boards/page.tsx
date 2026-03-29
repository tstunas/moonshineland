import Link from "next/link";
import { revalidatePath } from "next/cache";
import { forbidden, redirect } from "next/navigation";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";

import { getCurrentUser } from "@/features/auth/queries";
import { recordAdminAudit } from "@/features/admin/audit";
import prisma from "@/lib/prisma";
import { AdminActionToast } from "@/components/ui/AdminActionToast";
import {
  buildConfirmHref,
  buildHref,
  clearConfirmQuery,
  DashboardSearchParams,
  formatDateTime,
  formatNumber,
  getIdsFromFormData,
  getPageSize,
  parseIdsCsv,
  parsePositiveInt,
  sanitizeReturnTo,
  toSingleParam,
  toPersistentParams,
  withToastQuery,
} from "@/app/(admin)/dashboard/_lib/pageHelpers";

export const metadata: Metadata = {
  title: "문샤인랜드: 관리자 게시판 관리",
};

const PATHNAME = "/dashboard/boards";
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

async function requireAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isAdmin) {
    forbidden();
  }

  const userId = Number(currentUser.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    forbidden();
  }

  return userId;
}

async function executeConfirmableAction(
  formData: FormData,
  adminUserId: number,
  actionKey: string,
  ids: number[],
  value: string | undefined,
  run: () => Promise<{ summary: string; details?: Record<string, unknown> } | null>,
) {
  const returnTo = sanitizeReturnTo(formData.get("returnTo"), PATHNAME);
  const confirmed = formData.get("confirmed") === "yes";

  if (!confirmed) {
    redirect(buildConfirmHref(returnTo, actionKey, ids, value));
  }

  const result = await run();
  if (!result) {
    redirect(withToastQuery(clearConfirmQuery(returnTo), "변경할 대상을 찾지 못했습니다.", "error"));
  }

  await recordAdminAudit({
    adminUserId,
    action: actionKey,
    targetType: "board",
    targetIds: ids,
    summary: result.summary,
    details: result.details,
  });

  revalidatePath(PATHNAME);
  redirect(withToastQuery(clearConfirmQuery(returnTo), result.summary, "success"));
}

async function updateBoardsHiddenAction(formData: FormData) {
  "use server";

  const adminUserId = await requireAdmin();
  const ids = getIdsFromFormData(formData, "selectedBoardIds");
  if (ids.length === 0) {
    const returnTo = sanitizeReturnTo(formData.get("returnTo"), PATHNAME);
    redirect(withToastQuery(returnTo, "선택된 게시판이 없습니다.", "error"));
  }

  const forceVisibilityValue = formData.get("forceVisibility");
  const forceVisibility =
    typeof forceVisibilityValue === "string" ? forceVisibilityValue : undefined;

  await executeConfirmableAction(formData, adminUserId, "boards-hidden", ids, forceVisibility, async () => {
    if (forceVisibility === "hidden" || forceVisibility === "visible") {
      const result = await prisma.board.updateMany({
        where: { id: { in: ids } },
        data: { isHidden: forceVisibility === "hidden" },
      });

      return {
        summary: `${result.count}개 게시판을 ${forceVisibility === "hidden" ? "숨김" : "공개"} 처리했습니다.`,
        details: { mode: "bulk", forceVisibility },
      };
    }

    if (ids.length !== 1) return null;

    const target = await prisma.board.findUnique({
      where: { id: ids[0] },
      select: { isHidden: true },
    });

    if (!target) return null;

    await prisma.board.update({
      where: { id: ids[0] },
      data: { isHidden: !target.isHidden },
    });

    return {
      summary: `게시판 1개의 공개 상태를 ${target.isHidden ? "공개" : "숨김"}으로 변경했습니다.`,
      details: { mode: "single", previous: target.isHidden },
    };
  });
}

interface BoardsPageProps {
  searchParams: Promise<DashboardSearchParams>;
}

export default async function DashboardBoardsPage({ searchParams }: BoardsPageProps) {
  const params = await searchParams;
  const currentParams = toPersistentParams(params);

  const query = toSingleParam(params.query).trim();
  const visibility = toSingleParam(params.visibility) || "all";
  const category = toSingleParam(params.category) || "all";
  const page = parsePositiveInt(toSingleParam(params.page), 1);
  const pageSize = getPageSize(toSingleParam(params.pageSize), 20, [...PAGE_SIZE_OPTIONS]);

  const confirmAction = toSingleParam(params.confirmAction);
  const confirmIds = parseIdsCsv(toSingleParam(params.confirmIds));
  const confirmValue = toSingleParam(params.confirmValue);
  const toastMessage = toSingleParam(params.toast);
  const toastType = toSingleParam(params.toastType) === "error" ? "error" : "success";

  const where: Prisma.BoardWhereInput = {
    ...(visibility === "visible" ? { isHidden: false } : {}),
    ...(visibility === "hidden" ? { isHidden: true } : {}),
    ...(category === "archive" ? { isArchive: true } : {}),
    ...(category === "basic" ? { isBasic: true } : {}),
    ...(category === "adult" ? { isAdultOnly: true } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { boardKey: { contains: query } },
          ],
        }
      : {}),
  };

  const [total, filteredTotal, hiddenCount, archiveCount] = await Promise.all([
    prisma.board.count(),
    prisma.board.count({ where }),
    prisma.board.count({ where: { ...where, isHidden: true } }),
    prisma.board.count({ where: { ...where, isArchive: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  const boards = await prisma.board.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip,
    take: pageSize,
    select: {
      id: true,
      boardKey: true,
      name: true,
      description: true,
      isHidden: true,
      isBasic: true,
      isArchive: true,
      isAdultOnly: true,
      updatedAt: true,
      createdAt: true,
      _count: {
        select: {
          threads: true,
          collaborators: true,
          joinedUsers: true,
        },
      },
    },
  });

  const returnTo = buildHref(PATHNAME, currentParams, {});
  const clearConfirmHref = clearConfirmQuery(returnTo);

  const prevHref = buildHref(PATHNAME, currentParams, { page: Math.max(1, safePage - 1) });
  const nextHref = buildHref(PATHNAME, currentParams, { page: safePage + 1 });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <AdminActionToast message={toastMessage} type={toastType} />
      {confirmAction === "boards-hidden" && confirmIds.length > 0 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-300 bg-white p-5 shadow-2xl">
            <p className="text-xs font-semibold tracking-[0.22em] text-rose-700 uppercase">Confirm Required</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">게시판 공개 상태를 변경하시겠습니까?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              선택한 {formatNumber(confirmIds.length)}개 게시판의 공개/숨김 상태를 변경합니다.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <Link href={clearConfirmHref} className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">취소</Link>
              <form action={updateBoardsHiddenAction}>
                <input type="hidden" name="selectedBoardIdsCsv" value={confirmIds.join(",")} />
                <input type="hidden" name="forceVisibility" value={confirmValue} />
                <input type="hidden" name="confirmed" value="yes" />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button type="submit" className="rounded-md border border-rose-700 bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700">변경 실행</button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

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
          <p>전체 게시판: {formatNumber(total)}</p>
          <p>조건 일치: {formatNumber(filteredTotal)}</p>
          <p>숨김: {formatNumber(hiddenCount)}</p>
          <p>아카이브: {formatNumber(archiveCount)}</p>
        </div>

        <form action={PATHNAME} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="text" name="query" defaultValue={query} placeholder="게시판명/키 검색" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select name="visibility" defaultValue={visibility} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="all">공개: 전체</option>
            <option value="visible">공개: 공개</option>
            <option value="hidden">공개: 숨김</option>
          </select>
          <select name="category" defaultValue={category} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="all">분류: 전체</option>
            <option value="basic">분류: 기본판</option>
            <option value="archive">분류: 아카이브</option>
            <option value="adult">분류: 성인전용</option>
          </select>
          <select name="pageSize" defaultValue={String(pageSize)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>페이지 크기: {size}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input type="hidden" name="page" value="1" />
            <button type="submit" className="rounded-md border border-sky-700 bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700">적용</button>
            <Link href={PATHNAME} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">초기화</Link>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <form>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700">선택된 게시판 일괄 처리</p>
            <div className="flex gap-2">
              <input type="hidden" name="returnTo" value={returnTo} />
              <button formAction={updateBoardsHiddenAction} type="submit" name="forceVisibility" value="visible" className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">선택 공개</button>
              <button formAction={updateBoardsHiddenAction} type="submit" name="forceVisibility" value="hidden" className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">선택 숨김</button>
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
                {boards.map((board) => (
                  <tr key={board.id} className="border-t border-slate-200 align-top">
                    <td className="px-4 py-3">
                      <input type="checkbox" name="selectedBoardIds" value={board.id} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/board/${board.boardKey}`} className="font-semibold text-slate-900 hover:text-sky-700">{board.name}</Link>
                      <p className="text-xs text-slate-500">/{board.boardKey}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{board.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${board.isHidden ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>{board.isHidden ? "숨김" : "공개"}</span>
                        {board.isBasic ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">기본</span> : null}
                        {board.isArchive ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">아카이브</span> : null}
                        {board.isAdultOnly ? <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">성인전용</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      협업자 {formatNumber(board._count.collaborators)} / 참여 {formatNumber(board._count.joinedUsers)} / 스레드 {formatNumber(board._count.threads)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(board.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(board.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button formAction={updateBoardsHiddenAction} type="submit" name="selectedBoardIds" value={board.id} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          {board.isHidden ? "공개" : "숨김"}
                        </button>
                        <Link href={`/board/${board.boardKey}`} className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100">이동</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>

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
