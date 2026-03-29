import Link from "next/link";
import { revalidatePath } from "next/cache";
import { forbidden, redirect } from "next/navigation";
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

const PATHNAME = "/dashboard/users";
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

async function requireAdminUserId() {
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
    targetType: "user",
    targetIds: ids,
    summary: result.summary,
    details: result.details,
  });

  revalidatePath(PATHNAME);
  redirect(withToastQuery(clearConfirmQuery(returnTo), result.summary, "success"));
}

async function updateUsersActiveAction(formData: FormData) {
  "use server";

  const adminUserId = await requireAdminUserId();
  const ids = getIdsFromFormData(formData, "selectedUserIds");
  if (ids.length === 0) {
    const returnTo = sanitizeReturnTo(formData.get("returnTo"), PATHNAME);
    redirect(withToastQuery(returnTo, "선택된 유저가 없습니다.", "error"));
  }

  const forceStateValue = formData.get("forceState");
  const forceState = typeof forceStateValue === "string" ? forceStateValue : undefined;

  await executeConfirmableAction(formData, adminUserId, "users-active", ids, forceState, async () => {
    if (forceState === "active" || forceState === "inactive") {
      const result = await prisma.user.updateMany({
        where: { id: { in: ids } },
        data: { isActive: forceState === "active" },
      });

      return {
        summary: `${result.count}명 유저를 ${forceState === "active" ? "활성화" : "비활성화"}했습니다.`,
        details: { mode: "bulk", forceState },
      };
    }

    if (ids.length !== 1) return null;

    const target = await prisma.user.findUnique({
      where: { id: ids[0] },
      select: { isActive: true },
    });

    if (!target) return null;

    await prisma.user.update({
      where: { id: ids[0] },
      data: { isActive: !target.isActive },
    });

    return {
      summary: `유저 1명의 상태를 ${target.isActive ? "비활성" : "활성"}으로 변경했습니다.`,
      details: { mode: "single", previous: target.isActive },
    };
  });
}

async function updateUsersAdminAction(formData: FormData) {
  "use server";

  const currentAdminId = await requireAdminUserId();
  const ids = getIdsFromFormData(formData, "selectedUserIds");
  if (ids.length === 0) {
    const returnTo = sanitizeReturnTo(formData.get("returnTo"), PATHNAME);
    redirect(withToastQuery(returnTo, "선택된 유저가 없습니다.", "error"));
  }

  const forceRoleValue = formData.get("forceRole");
  const forceRole = typeof forceRoleValue === "string" ? forceRoleValue : undefined;

  await executeConfirmableAction(formData, currentAdminId, "users-admin", ids, forceRole, async () => {
    if (forceRole === "admin" || forceRole === "user") {
      const safeIds =
        forceRole === "user" ? ids.filter((id) => id !== currentAdminId) : ids;

      if (safeIds.length === 0) {
        return {
          summary: "자기 자신의 관리자 권한은 해제할 수 없습니다.",
          details: { mode: "bulk", skippedSelf: true },
        };
      }

      const result = await prisma.user.updateMany({
        where: { id: { in: safeIds } },
        data: { isAdmin: forceRole === "admin" },
      });

      return {
        summary: `${result.count}명 유저의 관리자 권한을 ${forceRole === "admin" ? "지정" : "해제"}했습니다.`,
        details: { mode: "bulk", forceRole },
      };
    }

    if (ids.length !== 1 || ids[0] === currentAdminId) return null;

    const target = await prisma.user.findUnique({
      where: { id: ids[0] },
      select: { isAdmin: true },
    });

    if (!target) return null;

    await prisma.user.update({
      where: { id: ids[0] },
      data: { isAdmin: !target.isAdmin },
    });

    return {
      summary: `유저 1명의 관리자 권한을 ${target.isAdmin ? "해제" : "지정"}했습니다.`,
      details: { mode: "single", previous: target.isAdmin },
    };
  });
}

interface UsersPageProps {
  searchParams: Promise<DashboardSearchParams>;
}

export default async function DashboardUsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const currentParams = toPersistentParams(params);

  const query = toSingleParam(params.query).trim();
  const status = toSingleParam(params.status) || "all";
  const role = toSingleParam(params.role) || "all";
  const page = parsePositiveInt(toSingleParam(params.page), 1);
  const pageSize = getPageSize(toSingleParam(params.pageSize), 20, [...PAGE_SIZE_OPTIONS]);

  const confirmAction = toSingleParam(params.confirmAction);
  const confirmIds = parseIdsCsv(toSingleParam(params.confirmIds));
  const confirmValue = toSingleParam(params.confirmValue);
  const toastMessage = toSingleParam(params.toast);
  const toastType = toSingleParam(params.toastType) === "error" ? "error" : "success";

  const where: Prisma.UserWhereInput = {
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
    ...(role === "admin" ? { isAdmin: true } : {}),
    ...(role === "user" ? { isAdmin: false } : {}),
    ...(query
      ? {
          OR: [
            { username: { contains: query } },
            { email: { contains: query } },
          ],
        }
      : {}),
  };

  const [total, filteredTotal, activeCount, adminCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where }),
    prisma.user.count({ where: { ...where, isActive: true } }),
    prisma.user.count({ where: { ...where, isAdmin: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
    select: {
      id: true,
      username: true,
      email: true,
      isActive: true,
      isAdmin: true,
      isAdultVerified: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          posts: true,
          threadsOwned: true,
        },
      },
    },
  });

  const returnTo = buildHref(PATHNAME, currentParams, {});
  const clearConfirmHref = clearConfirmQuery(returnTo);

  const confirmTitle =
    confirmAction === "users-active"
      ? "유저 활성 상태를 변경하시겠습니까?"
      : confirmAction === "users-admin"
        ? "유저 관리자 권한을 변경하시겠습니까?"
        : "";

  const confirmDescription =
    confirmAction === "users-active"
      ? `선택한 ${formatNumber(confirmIds.length)}명 계정의 활성 상태를 변경합니다.`
      : confirmAction === "users-admin"
        ? `선택한 ${formatNumber(confirmIds.length)}명 계정의 관리자 권한을 변경합니다.`
        : "";

  const prevHref = buildHref(PATHNAME, currentParams, { page: Math.max(1, safePage - 1) });
  const nextHref = buildHref(PATHNAME, currentParams, { page: safePage + 1 });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <AdminActionToast message={toastMessage} type={toastType} />
      {confirmAction && confirmIds.length > 0 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-300 bg-white p-5 shadow-2xl">
            <p className="text-xs font-semibold tracking-[0.22em] text-rose-700 uppercase">
              Confirm Required
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">{confirmTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{confirmDescription}</p>

            <div className="mt-5 flex justify-end gap-2">
              <Link
                href={clearConfirmHref}
                className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                취소
              </Link>

              {confirmAction === "users-active" ? (
                <form action={updateUsersActiveAction}>
                  <input type="hidden" name="selectedUserIdsCsv" value={confirmIds.join(",")} />
                  <input type="hidden" name="forceState" value={confirmValue} />
                  <input type="hidden" name="confirmed" value="yes" />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button
                    type="submit"
                    className="rounded-md border border-rose-700 bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    변경 실행
                  </button>
                </form>
              ) : null}

              {confirmAction === "users-admin" ? (
                <form action={updateUsersAdminAction}>
                  <input type="hidden" name="selectedUserIdsCsv" value={confirmIds.join(",")} />
                  <input type="hidden" name="forceRole" value={confirmValue} />
                  <input type="hidden" name="confirmed" value="yes" />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button
                    type="submit"
                    className="rounded-md border border-rose-700 bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    변경 실행
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

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
          <p>전체 유저: {formatNumber(total)}</p>
          <p>조건 일치: {formatNumber(filteredTotal)}</p>
          <p>활성: {formatNumber(activeCount)}</p>
          <p>관리자: {formatNumber(adminCount)}</p>
        </div>

        <form action={PATHNAME} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            name="query"
            defaultValue={query}
            placeholder="닉네임/이메일 검색"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select name="status" defaultValue={status} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="all">상태: 전체</option>
            <option value="active">상태: 활성</option>
            <option value="inactive">상태: 비활성</option>
          </select>
          <select name="role" defaultValue={role} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="all">권한: 전체</option>
            <option value="admin">권한: 관리자</option>
            <option value="user">권한: 일반</option>
          </select>
          <select name="pageSize" defaultValue={String(pageSize)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                페이지 크기: {size}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input type="hidden" name="page" value="1" />
            <button
              type="submit"
              className="rounded-md border border-sky-700 bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              적용
            </button>
            <Link
              href={PATHNAME}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              초기화
            </Link>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <form action={updateUsersActiveAction}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700">선택된 유저 일괄 상태 변경</p>
            <div className="flex gap-2">
              <input type="hidden" name="returnTo" value={returnTo} />
              <button
                type="submit"
                name="forceState"
                value="active"
                className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                일괄 활성화
              </button>
              <button
                type="submit"
                name="forceState"
                value="inactive"
                className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
              >
                일괄 비활성화
              </button>
              <button
                formAction={updateUsersAdminAction}
                type="submit"
                name="forceRole"
                value="admin"
                className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
              >
                일괄 관리자 지정
              </button>
              <button
                formAction={updateUsersAdminAction}
                type="submit"
                name="forceRole"
                value="user"
                className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                일괄 관리자 해제
              </button>
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
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-200 align-top">
                    <td className="px-4 py-3">
                      <input type="checkbox" name="selectedUserIds" value={user.id} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{user.username}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${user.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                          {user.isActive ? "활성" : "비활성"}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${user.isAdmin ? "bg-sky-100 text-sky-800" : "bg-slate-200 text-slate-700"}`}>
                          {user.isAdmin ? "관리자" : "일반"}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${user.isAdultVerified ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"}`}>
                          {user.isAdultVerified ? "성인인증" : "미인증"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      게시글 {formatNumber(user._count.posts)} / 스레드 {formatNumber(user._count.threadsOwned)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(user.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(user.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          formAction={updateUsersActiveAction}
                          type="submit"
                          name="selectedUserIds"
                          value={user.id}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {user.isActive ? "비활성" : "활성"}
                        </button>

                        <button
                          formAction={updateUsersAdminAction}
                          type="submit"
                          name="selectedUserIds"
                          value={user.id}
                          className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                        >
                          {user.isAdmin ? "관리자 해제" : "관리자 지정"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <p>
            페이지 {formatNumber(safePage)} / {formatNumber(totalPages)}
          </p>
          <div className="flex gap-2">
            {safePage > 1 ? (
              <Link href={prevHref} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100">
                이전
              </Link>
            ) : (
              <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-slate-400">이전</span>
            )}
            {safePage < totalPages ? (
              <Link href={nextHref} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100">
                다음
              </Link>
            ) : (
              <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-slate-400">다음</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
