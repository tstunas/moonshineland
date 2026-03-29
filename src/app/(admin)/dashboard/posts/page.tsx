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
  title: "문샤인랜드: 관리자 게시글 관리",
};

const PATHNAME = "/dashboard/posts";
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
    targetType: "post",
    targetIds: ids,
    summary: result.summary,
    details: result.details,
  });

  revalidatePath(PATHNAME);
  redirect(withToastQuery(clearConfirmQuery(returnTo), result.summary, "success"));
}

async function updatePostsHiddenAction(formData: FormData) {
  "use server";

  const adminUserId = await requireAdmin();
  const ids = getIdsFromFormData(formData, "selectedPostIds");
  if (ids.length === 0) {
    const returnTo = sanitizeReturnTo(formData.get("returnTo"), PATHNAME);
    redirect(withToastQuery(returnTo, "선택된 레스가 없습니다.", "error"));
  }

  const forceVisibilityValue = formData.get("forceVisibility");
  const forceVisibility =
    typeof forceVisibilityValue === "string" ? forceVisibilityValue : undefined;

  await executeConfirmableAction(formData, adminUserId, "posts-hidden", ids, forceVisibility, async () => {
    if (forceVisibility === "hidden" || forceVisibility === "visible") {
      const result = await prisma.post.updateMany({
        where: { id: { in: ids } },
        data: { isHidden: forceVisibility === "hidden" },
      });

      return {
        summary: `${result.count}개 레스를 ${forceVisibility === "hidden" ? "숨김" : "공개"} 처리했습니다.`,
        details: { mode: "bulk", forceVisibility },
      };
    }

    if (ids.length !== 1) return null;

    const target = await prisma.post.findUnique({
      where: { id: ids[0] },
      select: { isHidden: true },
    });

    if (!target) return null;

    await prisma.post.update({
      where: { id: ids[0] },
      data: { isHidden: !target.isHidden },
    });

    return {
      summary: `레스 1개의 공개 상태를 ${target.isHidden ? "공개" : "숨김"}으로 변경했습니다.`,
      details: { mode: "single", previous: target.isHidden },
    };
  });
}

interface PostsPageProps {
  searchParams: Promise<DashboardSearchParams>;
}

export default async function DashboardPostsPage({ searchParams }: PostsPageProps) {
  const params = await searchParams;
  const currentParams = toPersistentParams(params);

  const query = toSingleParam(params.query).trim();
  const visibility = toSingleParam(params.visibility) || "all";
  const autoType = toSingleParam(params.autoType) || "all";
  const contentType = toSingleParam(params.contentType) || "all";
  const page = parsePositiveInt(toSingleParam(params.page), 1);
  const pageSize = getPageSize(toSingleParam(params.pageSize), 20, [...PAGE_SIZE_OPTIONS]);

  const confirmAction = toSingleParam(params.confirmAction);
  const confirmIds = parseIdsCsv(toSingleParam(params.confirmIds));
  const confirmValue = toSingleParam(params.confirmValue);
  const toastMessage = toSingleParam(params.toast);
  const toastType = toSingleParam(params.toastType) === "error" ? "error" : "success";
  const contentTypeFilter =
    contentType === "text" ||
    contentType === "aa" ||
    contentType === "novel" ||
    contentType === "line"
      ? contentType
      : null;

  const where: Prisma.PostWhereInput = {
    ...(visibility === "visible" ? { isHidden: false } : {}),
    ...(visibility === "hidden" ? { isHidden: true } : {}),
    ...(autoType === "auto" ? { isAutoPost: true } : {}),
    ...(autoType === "manual" ? { isAutoPost: false } : {}),
    ...(contentTypeFilter ? { contentType: contentTypeFilter } : {}),
    ...(query
      ? {
          OR: [
            { author: { contains: query } },
            { thread: { title: { contains: query } } },
            { thread: { board: { boardKey: { contains: query } } } },
          ],
        }
      : {}),
  };

  const [total, filteredTotal, hiddenCount, autoCount] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where }),
    prisma.post.count({ where: { ...where, isHidden: true } }),
    prisma.post.count({ where: { ...where, isAutoPost: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
    select: {
      id: true,
      postOrder: true,
      author: true,
      contentType: true,
      isHidden: true,
      isAutoPost: true,
      createdAt: true,
      updatedAt: true,
      thread: {
        select: {
          id: true,
          threadIndex: true,
          title: true,
          board: {
            select: {
              boardKey: true,
              name: true,
            },
          },
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
      {confirmAction === "posts-hidden" && confirmIds.length > 0 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-300 bg-white p-5 shadow-2xl">
            <p className="text-xs font-semibold tracking-[0.22em] text-rose-700 uppercase">Confirm Required</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">레스 공개 상태를 변경하시겠습니까?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              선택한 {formatNumber(confirmIds.length)}개 레스의 공개/숨김 상태를 변경합니다.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <Link href={clearConfirmHref} className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">취소</Link>
              <form action={updatePostsHiddenAction}>
                <input type="hidden" name="selectedPostIdsCsv" value={confirmIds.join(",")} />
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
            <h1 className="text-2xl font-black text-slate-900">레스 상세 관리</h1>
          </div>
          <div className="flex gap-2 text-xs">
            <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">요약 대시보드</Link>
            <Link href="/dashboard/users" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">유저</Link>
            <Link href="/dashboard/boards" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">게시판</Link>
            <Link href="/dashboard/threads" className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">스레드</Link>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-4">
          <p>전체 레스: {formatNumber(total)}</p>
          <p>조건 일치: {formatNumber(filteredTotal)}</p>
          <p>숨김: {formatNumber(hiddenCount)}</p>
          <p>자동: {formatNumber(autoCount)}</p>
        </div>

        <form action={PATHNAME} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input type="text" name="query" defaultValue={query} placeholder="작성자/스레드/boardKey 검색" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select name="visibility" defaultValue={visibility} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="all">공개: 전체</option>
            <option value="visible">공개: 공개</option>
            <option value="hidden">공개: 숨김</option>
          </select>
          <select name="autoType" defaultValue={autoType} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="all">투하: 전체</option>
            <option value="manual">투하: 수동</option>
            <option value="auto">투하: 자동</option>
          </select>
          <select name="contentType" defaultValue={contentType} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="all">콘텐츠: 전체</option>
            <option value="text">콘텐츠: text</option>
            <option value="aa">콘텐츠: aa</option>
            <option value="novel">콘텐츠: novel</option>
            <option value="line">콘텐츠: line</option>
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
            <p className="text-sm font-semibold text-slate-700">선택된 레스 일괄 처리</p>
            <div className="flex gap-2">
              <input type="hidden" name="returnTo" value={returnTo} />
              <button formAction={updatePostsHiddenAction} type="submit" name="forceVisibility" value="visible" className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">선택 공개</button>
              <button formAction={updatePostsHiddenAction} type="submit" name="forceVisibility" value="hidden" className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">선택 숨김</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">선택</th>
                  <th className="px-4 py-3">레스</th>
                  <th className="px-4 py-3">속성</th>
                  <th className="px-4 py-3">스레드</th>
                  <th className="px-4 py-3">생성</th>
                  <th className="px-4 py-3">수정</th>
                  <th className="px-4 py-3 text-right">개별 작업</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const threadHref = `/board/${post.thread.board.boardKey}/${post.thread.threadIndex}`;

                  return (
                    <tr key={post.id} className="border-t border-slate-200 align-top">
                      <td className="px-4 py-3">
                        <input type="checkbox" name="selectedPostIds" value={post.id} className="h-4 w-4" />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">레스 #{post.postOrder}</p>
                        <p className="text-xs text-slate-500">작성자 {post.author}</p>
                        <p className="text-xs text-slate-500">타입 {post.contentType}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${post.isHidden ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>{post.isHidden ? "숨김" : "공개"}</span>
                          {post.isAutoPost ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">자동</span> : <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">수동</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={threadHref} className="font-semibold text-slate-900 hover:text-sky-700">{post.thread.board.name} / #{post.thread.threadIndex}</Link>
                        <p className="line-clamp-1 text-xs text-slate-500">{post.thread.title}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(post.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(post.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button formAction={updatePostsHiddenAction} type="submit" name="selectedPostIds" value={post.id} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">{post.isHidden ? "공개" : "숨김"}</button>
                          <Link href={threadHref} className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100">이동</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
