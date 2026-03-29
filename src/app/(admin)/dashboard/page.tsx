import Link from "next/link";
import { revalidatePath } from "next/cache";
import { forbidden, redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";

import { getCurrentUser } from "@/features/auth/queries";
import prisma from "@/lib/prisma";

const MAX_RECENT_USERS = 8;
const MAX_RECENT_BOARDS = 8;
const MAX_RECENT_THREADS = 8;
const MAX_RECENT_POSTS = 12;

type DashboardSearchParams = Record<string, string | string[] | undefined>;
type ConfirmActionKey =
  | "user-active"
  | "user-admin"
  | "board-hidden"
  | "thread-hidden"
  | "post-hidden";

function parseId(value: FormDataEntryValue | null): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function formatDateTime(value: Date): string {
  return value.toLocaleString("ko-KR", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function toSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parsePage(value: string, fallback = 1): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function sanitizeReturnTo(raw: FormDataEntryValue | null): string {
  if (typeof raw !== "string") {
    return "/dashboard";
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("/dashboard")) {
    return "/dashboard";
  }

  return trimmed;
}

function withConfirmQuery(
  returnTo: string,
  action: ConfirmActionKey,
  targetId: number,
): string {
  const url = new URL(returnTo, "http://localhost");
  url.searchParams.set("confirmAction", action);
  url.searchParams.set("confirmTarget", String(targetId));

  const query = url.searchParams.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}

function withoutConfirmQuery(returnTo: string): string {
  const url = new URL(returnTo, "http://localhost");
  url.searchParams.delete("confirmAction");
  url.searchParams.delete("confirmTarget");

  const query = url.searchParams.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}

function buildDashboardHref(
  baseParams: URLSearchParams,
  updates: Record<string, string | number | undefined>,
): string {
  const next = new URLSearchParams(baseParams);

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      next.delete(key);
      return;
    }

    next.set(key, String(value));
  });

  const query = next.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

function isPendingAction(
  confirmAction: string,
  confirmTarget: string,
  action: ConfirmActionKey,
  targetId: number,
): boolean {
  return confirmAction === action && confirmTarget === String(targetId);
}

async function executeWithTwoStepConfirm(
  formData: FormData,
  action: ConfirmActionKey,
  targetId: number,
  run: () => Promise<void>,
) {
  const returnTo = sanitizeReturnTo(formData.get("returnTo"));
  const confirmed = formData.get("confirm") === "yes";

  if (!confirmed) {
    redirect(withConfirmQuery(returnTo, action, targetId));
  }

  await run();
  revalidatePath("/dashboard");
  redirect(withoutConfirmQuery(returnTo));
}

function renderPagination(
  page: number,
  totalPages: number,
  prevHref: string,
  nextHref: string,
) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
      <p>
        페이지 {formatNumber(page)} / {formatNumber(totalPages)}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={prevHref}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            이전
          </Link>
        ) : (
          <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-slate-400">
            이전
          </span>
        )}

        {page < totalPages ? (
          <Link
            href={nextHref}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            다음
          </Link>
        ) : (
          <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-slate-400">
            다음
          </span>
        )}
      </div>
    </div>
  );
}

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

async function toggleUserActiveAction(formData: FormData) {
  "use server";

  await requireAdminUserId();
  const userId = parseId(formData.get("userId"));
  if (!userId) return;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  });

  if (!target) return;

  await executeWithTwoStepConfirm(formData, "user-active", userId, async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: !target.isActive },
    });
  });
}

async function toggleUserAdminAction(formData: FormData) {
  "use server";

  const currentAdminId = await requireAdminUserId();
  const userId = parseId(formData.get("userId"));
  if (!userId || userId === currentAdminId) return;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  if (!target) return;

  await executeWithTwoStepConfirm(formData, "user-admin", userId, async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { isAdmin: !target.isAdmin },
    });
  });
}

async function toggleBoardHiddenAction(formData: FormData) {
  "use server";

  await requireAdminUserId();
  const boardId = parseId(formData.get("boardId"));
  if (!boardId) return;

  const target = await prisma.board.findUnique({
    where: { id: boardId },
    select: { isHidden: true },
  });

  if (!target) return;

  await executeWithTwoStepConfirm(formData, "board-hidden", boardId, async () => {
    await prisma.board.update({
      where: { id: boardId },
      data: { isHidden: !target.isHidden },
    });
  });
}

async function toggleThreadHiddenAction(formData: FormData) {
  "use server";

  await requireAdminUserId();
  const threadId = parseId(formData.get("threadId"));
  if (!threadId) return;

  const target = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { isHidden: true },
  });

  if (!target) return;

  await executeWithTwoStepConfirm(formData, "thread-hidden", threadId, async () => {
    await prisma.thread.update({
      where: { id: threadId },
      data: { isHidden: !target.isHidden },
    });
  });
}

async function togglePostHiddenAction(formData: FormData) {
  "use server";

  await requireAdminUserId();
  const postId = parseId(formData.get("postId"));
  if (!postId) return;

  const target = await prisma.post.findUnique({
    where: { id: postId },
    select: { isHidden: true },
  });

  if (!target) return;

  await executeWithTwoStepConfirm(formData, "post-hidden", postId, async () => {
    await prisma.post.update({
      where: { id: postId },
      data: { isHidden: !target.isHidden },
    });
  });
}

interface DashboardPageProps {
  searchParams: Promise<DashboardSearchParams>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentParams = new URLSearchParams();

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    const single = toSingleParam(value);
    if (!single) return;
    currentParams.set(key, single);
  });

  const confirmAction = toSingleParam(resolvedSearchParams.confirmAction);
  const confirmTarget = toSingleParam(resolvedSearchParams.confirmTarget);
  const returnTo = buildDashboardHref(currentParams, {});

  const userQuery = toSingleParam(resolvedSearchParams.userQuery).trim();
  const userStatus = toSingleParam(resolvedSearchParams.userStatus) || "all";
  const userRole = toSingleParam(resolvedSearchParams.userRole) || "all";
  const boardQuery = toSingleParam(resolvedSearchParams.boardQuery).trim();
  const boardVisibility = toSingleParam(resolvedSearchParams.boardVisibility) || "all";
  const threadQuery = toSingleParam(resolvedSearchParams.threadQuery).trim();
  const threadVisibility = toSingleParam(resolvedSearchParams.threadVisibility) || "all";
  const threadType = toSingleParam(resolvedSearchParams.threadType) || "all";
  const postQuery = toSingleParam(resolvedSearchParams.postQuery).trim();
  const postVisibility = toSingleParam(resolvedSearchParams.postVisibility) || "all";
  const postAuto = toSingleParam(resolvedSearchParams.postAuto) || "all";

  const requestedUsersPage = parsePage(toSingleParam(resolvedSearchParams.usersPage), 1);
  const requestedBoardsPage = parsePage(toSingleParam(resolvedSearchParams.boardsPage), 1);
  const requestedThreadsPage = parsePage(toSingleParam(resolvedSearchParams.threadsPage), 1);
  const requestedPostsPage = parsePage(toSingleParam(resolvedSearchParams.postsPage), 1);

  const userWhere: Prisma.UserWhereInput = {
    ...(userStatus === "active" ? { isActive: true } : {}),
    ...(userStatus === "inactive" ? { isActive: false } : {}),
    ...(userRole === "admin" ? { isAdmin: true } : {}),
    ...(userRole === "user" ? { isAdmin: false } : {}),
    ...(userQuery
      ? {
          OR: [
            { username: { contains: userQuery } },
            { email: { contains: userQuery } },
          ],
        }
      : {}),
  };

  const boardWhere: Prisma.BoardWhereInput = {
    ...(boardVisibility === "visible" ? { isHidden: false } : {}),
    ...(boardVisibility === "hidden" ? { isHidden: true } : {}),
    ...(boardQuery
      ? {
          OR: [
            { name: { contains: boardQuery } },
            { boardKey: { contains: boardQuery } },
          ],
        }
      : {}),
  };

  const threadWhere: Prisma.ThreadWhereInput = {
    ...(threadVisibility === "visible" ? { isHidden: false } : {}),
    ...(threadVisibility === "hidden" ? { isHidden: true } : {}),
    ...(threadType === "chat" ? { isChat: true } : {}),
    ...(threadType === "serial" ? { isChat: false } : {}),
    ...(threadQuery
      ? {
          OR: [
            { title: { contains: threadQuery } },
            { author: { contains: threadQuery } },
          ],
        }
      : {}),
  };

  const postWhere: Prisma.PostWhereInput = {
    ...(postVisibility === "visible" ? { isHidden: false } : {}),
    ...(postVisibility === "hidden" ? { isHidden: true } : {}),
    ...(postAuto === "auto" ? { isAutoPost: true } : {}),
    ...(postAuto === "manual" ? { isAutoPost: false } : {}),
    ...(postQuery
      ? {
          OR: [
            { author: { contains: postQuery } },
            { thread: { title: { contains: postQuery } } },
          ],
        }
      : {}),
  };

  const [
    usersTotal,
    usersActive,
    usersAdmin,
    boardsTotal,
    boardsHidden,
    threadsTotal,
    threadsHidden,
    threadsChat,
    threadsAdult,
    postsTotal,
    postsHidden,
    postsAuto,
    recentAuditLogs,
    usersFilteredTotal,
    boardsFilteredTotal,
    threadsFilteredTotal,
    postsFilteredTotal,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isAdmin: true } }),
    prisma.board.count(),
    prisma.board.count({ where: { isHidden: true } }),
    prisma.thread.count(),
    prisma.thread.count({ where: { isHidden: true } }),
    prisma.thread.count({ where: { isChat: true } }),
    prisma.thread.count({ where: { isAdultOnly: true } }),
    prisma.post.count(),
    prisma.post.count({ where: { isHidden: true } }),
    prisma.post.count({ where: { isAutoPost: true } }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        action: true,
        targetType: true,
        summary: true,
        createdAt: true,
        adminUser: {
          select: {
            username: true,
            email: true,
          },
        },
      },
    }),
    prisma.user.count({ where: userWhere }),
    prisma.board.count({ where: boardWhere }),
    prisma.thread.count({ where: threadWhere }),
    prisma.post.count({ where: postWhere }),
  ]);

  const usersTotalPages = Math.max(1, Math.ceil(usersFilteredTotal / MAX_RECENT_USERS));
  const boardsTotalPages = Math.max(1, Math.ceil(boardsFilteredTotal / MAX_RECENT_BOARDS));
  const threadsTotalPages = Math.max(1, Math.ceil(threadsFilteredTotal / MAX_RECENT_THREADS));
  const postsTotalPages = Math.max(1, Math.ceil(postsFilteredTotal / MAX_RECENT_POSTS));

  const usersPage = Math.min(requestedUsersPage, usersTotalPages);
  const boardsPage = Math.min(requestedBoardsPage, boardsTotalPages);
  const threadsPage = Math.min(requestedThreadsPage, threadsTotalPages);
  const postsPage = Math.min(requestedPostsPage, postsTotalPages);

  const usersSkip = (usersPage - 1) * MAX_RECENT_USERS;
  const boardsSkip = (boardsPage - 1) * MAX_RECENT_BOARDS;
  const threadsSkip = (threadsPage - 1) * MAX_RECENT_THREADS;
  const postsSkip = (postsPage - 1) * MAX_RECENT_POSTS;

  const [recentUsers, recentBoards, recentThreads, recentPosts] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      orderBy: { createdAt: "desc" },
      skip: usersSkip,
      take: MAX_RECENT_USERS,
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        isAdmin: true,
        isAdultVerified: true,
        createdAt: true,
      },
    }),
    prisma.board.findMany({
      where: boardWhere,
      orderBy: { updatedAt: "desc" },
      skip: boardsSkip,
      take: MAX_RECENT_BOARDS,
      select: {
        id: true,
        boardKey: true,
        name: true,
        isHidden: true,
        isArchive: true,
        isAdultOnly: true,
        updatedAt: true,
        _count: {
          select: {
            threads: true,
          },
        },
      },
    }),
    prisma.thread.findMany({
      where: threadWhere,
      orderBy: { updatedAt: "desc" },
      skip: threadsSkip,
      take: MAX_RECENT_THREADS,
      select: {
        id: true,
        threadIndex: true,
        title: true,
        postCount: true,
        isHidden: true,
        isChat: true,
        isAdultOnly: true,
        isArchive: true,
        updatedAt: true,
        board: {
          select: {
            boardKey: true,
            name: true,
          },
        },
      },
    }),
    prisma.post.findMany({
      where: postWhere,
      orderBy: { createdAt: "desc" },
      skip: postsSkip,
      take: MAX_RECENT_POSTS,
      select: {
        id: true,
        postOrder: true,
        author: true,
        contentType: true,
        isHidden: true,
        isAutoPost: true,
        createdAt: true,
        thread: {
          select: {
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
    }),
  ]);

  const statCards = [
    {
      title: "유저",
      primary: formatNumber(usersTotal),
      detail: `활성 ${formatNumber(usersActive)} / 관리자 ${formatNumber(usersAdmin)}`,
      tone: "from-sky-500 to-cyan-500",
    },
    {
      title: "게시판",
      primary: formatNumber(boardsTotal),
      detail: `숨김 ${formatNumber(boardsHidden)}`,
      tone: "from-emerald-500 to-lime-500",
    },
    {
      title: "스레드",
      primary: formatNumber(threadsTotal),
      detail: `숨김 ${formatNumber(threadsHidden)} / 채팅 ${formatNumber(threadsChat)} / 성인 ${formatNumber(threadsAdult)}`,
      tone: "from-amber-500 to-orange-500",
    },
    {
      title: "레스",
      primary: formatNumber(postsTotal),
      detail: `숨김 ${formatNumber(postsHidden)} / 자동 ${formatNumber(postsAuto)}`,
      tone: "from-rose-500 to-pink-500",
    },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">검색 및 필터</h2>
            <p className="text-xs text-slate-500">유저, 게시판, 스레드, 레스 목록을 조건별로 좁혀서 관리할 수 있습니다.</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            필터 초기화
          </Link>
        </div>

        <form action="/dashboard" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input
            type="text"
            name="userQuery"
            defaultValue={userQuery}
            placeholder="유저 검색 (닉네임/이메일)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select name="userStatus" defaultValue={userStatus} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="all">유저 상태: 전체</option>
            <option value="active">유저 상태: 활성</option>
            <option value="inactive">유저 상태: 비활성</option>
          </select>
          <select name="userRole" defaultValue={userRole} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="all">유저 권한: 전체</option>
            <option value="admin">유저 권한: 관리자</option>
            <option value="user">유저 권한: 일반</option>
          </select>
          <input
            type="text"
            name="boardQuery"
            defaultValue={boardQuery}
            placeholder="게시판 검색 (이름/키)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            name="boardVisibility"
            defaultValue={boardVisibility}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">게시판 공개: 전체</option>
            <option value="visible">게시판 공개: 공개</option>
            <option value="hidden">게시판 공개: 숨김</option>
          </select>
          <input
            type="text"
            name="threadQuery"
            defaultValue={threadQuery}
            placeholder="스레드 검색 (제목/작성자)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            name="threadVisibility"
            defaultValue={threadVisibility}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">스레드 공개: 전체</option>
            <option value="visible">스레드 공개: 공개</option>
            <option value="hidden">스레드 공개: 숨김</option>
          </select>
          <select name="threadType" defaultValue={threadType} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="all">스레드 타입: 전체</option>
            <option value="serial">스레드 타입: 연재</option>
            <option value="chat">스레드 타입: 채팅</option>
          </select>
          <input
            type="text"
            name="postQuery"
            defaultValue={postQuery}
            placeholder="레스 검색 (작성자/스레드 제목)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            name="postVisibility"
            defaultValue={postVisibility}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">레스 공개: 전체</option>
            <option value="visible">레스 공개: 공개</option>
            <option value="hidden">레스 공개: 숨김</option>
          </select>
          <select name="postAuto" defaultValue={postAuto} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="all">레스 유형: 전체</option>
            <option value="manual">레스 유형: 수동</option>
            <option value="auto">레스 유형: 자동</option>
          </select>

          <input type="hidden" name="usersPage" value="1" />
          <input type="hidden" name="boardsPage" value="1" />
          <input type="hidden" name="threadsPage" value="1" />
          <input type="hidden" name="postsPage" value="1" />

          <div className="sm:col-span-2 xl:col-span-4">
            <button
              type="submit"
              className="rounded-md border border-sky-700 bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              필터 적용
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="bg-[linear-gradient(120deg,#0f172a,#1d4ed8)] px-6 py-6 text-white sm:px-8">
          <p className="text-xs font-semibold tracking-[0.22em] text-sky-100 uppercase">
            Admin Dashboard
          </p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">운영 현황 및 통합 관리</h1>
          <p className="mt-2 text-sm text-sky-100 sm:text-base">
            유저, 게시판, 스레드, 레스를 한 화면에서 모니터링하고 즉시 조치할 수
            있습니다.
          </p>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
          {statCards.map((card) => (
            <article key={card.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className={`h-1.5 w-16 rounded-full bg-gradient-to-r ${card.tone}`} />
              <p className="mt-3 text-sm font-semibold text-slate-600">{card.title}</p>
              <p className="mt-1 text-3xl font-black text-slate-900">{card.primary}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/dashboard/users"
          className="rounded-xl border border-slate-300 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
        >
          <p className="text-sm font-bold text-slate-900">유저 상세 관리</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">검색, 페이지 크기, 일괄 상태/권한 변경</p>
        </Link>
        <Link
          href="/dashboard/boards"
          className="rounded-xl border border-slate-300 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
        >
          <p className="text-sm font-bold text-slate-900">게시판 상세 관리</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">검색, 페이지 크기, 일괄 공개/숨김 변경</p>
        </Link>
        <Link
          href="/dashboard/threads"
          className="rounded-xl border border-slate-300 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
        >
          <p className="text-sm font-bold text-slate-900">스레드 상세 관리</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">검색, 타입 필터, 일괄 공개/숨김 변경</p>
        </Link>
        <Link
          href="/dashboard/posts"
          className="rounded-xl border border-slate-300 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
        >
          <p className="text-sm font-bold text-slate-900">레스 상세 관리</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">검색, 콘텐츠 필터, 일괄 공개/숨김 변경</p>
        </Link>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">최근 작업 감사 로그</h2>
            <p className="text-xs text-slate-500">관리자 작업 이력의 최신 12건입니다.</p>
          </div>
          <Link
            href="/audits"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            전체 로그 보기
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">시각</th>
                <th className="px-4 py-3">관리자</th>
                <th className="px-4 py-3">작업</th>
                <th className="px-4 py-3">대상</th>
                <th className="px-4 py-3">요약</th>
              </tr>
            </thead>
            <tbody>
              {recentAuditLogs.map((log) => (
                <tr key={log.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {log.adminUser.username} ({log.adminUser.email})
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-800">{log.action}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{log.targetType}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">최근 유저 관리</h2>
            <p className="text-xs text-slate-500">
              계정 상태와 관리자 권한을 즉시 조정할 수 있습니다. 현재
              {" "}{formatNumber(usersFilteredTotal)}명 조건 일치
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">유저</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">가입</th>
                  <th className="px-4 py-3 text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user.id} className="border-t border-slate-200 align-top">
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
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <form action={toggleUserActiveAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          {isPendingAction(confirmAction, confirmTarget, "user-active", user.id) ? (
                            <input type="hidden" name="confirm" value="yes" />
                          ) : null}
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {isPendingAction(confirmAction, confirmTarget, "user-active", user.id)
                              ? "활성 상태 변경 확인"
                              : user.isActive
                                ? "비활성화"
                                : "활성화"}
                          </button>
                        </form>

                        <form action={toggleUserAdminAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          {isPendingAction(confirmAction, confirmTarget, "user-admin", user.id) ? (
                            <input type="hidden" name="confirm" value="yes" />
                          ) : null}
                          <button
                            type="submit"
                            className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                          >
                            {isPendingAction(confirmAction, confirmTarget, "user-admin", user.id)
                              ? "관리자 권한 변경 확인"
                              : user.isAdmin
                                ? "관리자 해제"
                                : "관리자 지정"}
                          </button>
                        </form>

                        {(isPendingAction(confirmAction, confirmTarget, "user-active", user.id) ||
                          isPendingAction(confirmAction, confirmTarget, "user-admin", user.id)) ? (
                          <Link
                            href={withoutConfirmQuery(returnTo)}
                            className="rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                          >
                            취소
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {renderPagination(
            usersPage,
            usersTotalPages,
            buildDashboardHref(currentParams, {
              usersPage: Math.max(1, usersPage - 1),
              confirmAction: undefined,
              confirmTarget: undefined,
            }),
            buildDashboardHref(currentParams, {
              usersPage: usersPage + 1,
              confirmAction: undefined,
              confirmTarget: undefined,
            }),
          )}
        </article>

        <article className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">게시판 관리</h2>
            <p className="text-xs text-slate-500">
              게시판 공개 여부와 주요 속성을 확인하고 조정합니다. 현재
              {" "}{formatNumber(boardsFilteredTotal)}개 조건 일치
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">게시판</th>
                  <th className="px-4 py-3">속성</th>
                  <th className="px-4 py-3">스레드 수</th>
                  <th className="px-4 py-3">업데이트</th>
                  <th className="px-4 py-3 text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {recentBoards.map((board) => (
                  <tr key={board.id} className="border-t border-slate-200 align-top">
                    <td className="px-4 py-3">
                      <Link href={`/board/${board.boardKey}`} className="font-semibold text-slate-900 hover:text-sky-700">
                        {board.name}
                      </Link>
                      <p className="text-xs text-slate-500">/{board.boardKey}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${board.isHidden ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                          {board.isHidden ? "숨김" : "공개"}
                        </span>
                        {board.isArchive ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">아카이브</span>
                        ) : null}
                        {board.isAdultOnly ? (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">성인전용</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                      {formatNumber(board._count.threads)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(board.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <form action={toggleBoardHiddenAction}>
                          <input type="hidden" name="boardId" value={board.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          {isPendingAction(confirmAction, confirmTarget, "board-hidden", board.id) ? (
                            <input type="hidden" name="confirm" value="yes" />
                          ) : null}
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {isPendingAction(confirmAction, confirmTarget, "board-hidden", board.id)
                              ? "게시판 공개 상태 변경 확인"
                              : board.isHidden
                                ? "공개 전환"
                                : "숨김 전환"}
                          </button>
                        </form>
                        <Link
                          href={`/board/${board.boardKey}`}
                          className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                        >
                          이동
                        </Link>

                        {isPendingAction(confirmAction, confirmTarget, "board-hidden", board.id) ? (
                          <Link
                            href={withoutConfirmQuery(returnTo)}
                            className="rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                          >
                            취소
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {renderPagination(
            boardsPage,
            boardsTotalPages,
            buildDashboardHref(currentParams, {
              boardsPage: Math.max(1, boardsPage - 1),
              confirmAction: undefined,
              confirmTarget: undefined,
            }),
            buildDashboardHref(currentParams, {
              boardsPage: boardsPage + 1,
              confirmAction: undefined,
              confirmTarget: undefined,
            }),
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">스레드 관리</h2>
            <p className="text-xs text-slate-500">
              최근 업데이트 스레드를 바로 확인하고 공개/숨김을 전환합니다. 현재
              {" "}{formatNumber(threadsFilteredTotal)}개 조건 일치
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">스레드</th>
                  <th className="px-4 py-3">속성</th>
                  <th className="px-4 py-3">레스 수</th>
                  <th className="px-4 py-3">업데이트</th>
                  <th className="px-4 py-3 text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {recentThreads.map((thread) => {
                  const threadHref = `/board/${thread.board.boardKey}/${thread.threadIndex}`;

                  return (
                    <tr key={thread.id} className="border-t border-slate-200 align-top">
                      <td className="px-4 py-3">
                        <Link href={threadHref} className="font-semibold text-slate-900 hover:text-sky-700">
                          {thread.title}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {thread.board.name} / #{thread.threadIndex}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${thread.isHidden ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                            {thread.isHidden ? "숨김" : "공개"}
                          </span>
                          {thread.isChat ? (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">채팅</span>
                          ) : null}
                          {thread.isAdultOnly ? (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">성인전용</span>
                          ) : null}
                          {thread.isArchive ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">아카이브</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                        {formatNumber(thread.postCount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(thread.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <form action={toggleThreadHiddenAction}>
                            <input type="hidden" name="threadId" value={thread.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            {isPendingAction(confirmAction, confirmTarget, "thread-hidden", thread.id) ? (
                              <input type="hidden" name="confirm" value="yes" />
                            ) : null}
                            <button
                              type="submit"
                              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              {isPendingAction(confirmAction, confirmTarget, "thread-hidden", thread.id)
                                ? "스레드 공개 상태 변경 확인"
                                : thread.isHidden
                                  ? "공개 전환"
                                  : "숨김 전환"}
                            </button>
                          </form>
                          <Link
                            href={threadHref}
                            className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                          >
                            이동
                          </Link>

                          {isPendingAction(confirmAction, confirmTarget, "thread-hidden", thread.id) ? (
                            <Link
                              href={withoutConfirmQuery(returnTo)}
                              className="rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                            >
                              취소
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {renderPagination(
            threadsPage,
            threadsTotalPages,
            buildDashboardHref(currentParams, {
              threadsPage: Math.max(1, threadsPage - 1),
              confirmAction: undefined,
              confirmTarget: undefined,
            }),
            buildDashboardHref(currentParams, {
              threadsPage: threadsPage + 1,
              confirmAction: undefined,
              confirmTarget: undefined,
            }),
          )}
        </article>

        <article className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">레스 관리</h2>
            <p className="text-xs text-slate-500">
              최근 생성 레스의 노출 상태를 빠르게 제어할 수 있습니다. 현재
              {" "}{formatNumber(postsFilteredTotal)}개 조건 일치
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">레스</th>
                  <th className="px-4 py-3">속성</th>
                  <th className="px-4 py-3">작성시각</th>
                  <th className="px-4 py-3 text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {recentPosts.map((post) => {
                  const postThreadHref = `/board/${post.thread.board.boardKey}/${post.thread.threadIndex}`;

                  return (
                    <tr key={post.id} className="border-t border-slate-200 align-top">
                      <td className="px-4 py-3">
                        <Link href={postThreadHref} className="font-semibold text-slate-900 hover:text-sky-700">
                          {post.thread.board.name} / #{post.thread.threadIndex} / 레스 {post.postOrder}
                        </Link>
                        <p className="text-xs text-slate-500">
                          작성자 {post.author} · 타입 {post.contentType}
                        </p>
                        <p className="line-clamp-1 text-xs text-slate-500">{post.thread.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${post.isHidden ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                            {post.isHidden ? "숨김" : "공개"}
                          </span>
                          {post.isAutoPost ? (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">자동</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(post.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <form action={togglePostHiddenAction}>
                            <input type="hidden" name="postId" value={post.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            {isPendingAction(confirmAction, confirmTarget, "post-hidden", post.id) ? (
                              <input type="hidden" name="confirm" value="yes" />
                            ) : null}
                            <button
                              type="submit"
                              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              {isPendingAction(confirmAction, confirmTarget, "post-hidden", post.id)
                                ? "레스 공개 상태 변경 확인"
                                : post.isHidden
                                  ? "공개 전환"
                                  : "숨김 전환"}
                            </button>
                          </form>
                          <Link
                            href={postThreadHref}
                            className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                          >
                            스레드 이동
                          </Link>

                          {isPendingAction(confirmAction, confirmTarget, "post-hidden", post.id) ? (
                            <Link
                              href={withoutConfirmQuery(returnTo)}
                              className="rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                            >
                              취소
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {renderPagination(
            postsPage,
            postsTotalPages,
            buildDashboardHref(currentParams, {
              postsPage: Math.max(1, postsPage - 1),
              confirmAction: undefined,
              confirmTarget: undefined,
            }),
            buildDashboardHref(currentParams, {
              postsPage: postsPage + 1,
              confirmAction: undefined,
              confirmTarget: undefined,
            }),
          )}
        </article>
      </section>
    </div>
  );
}
