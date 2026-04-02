"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Prisma } from "@/generated/prisma/client";

const MAX_RECENT_USERS = 8;
const MAX_RECENT_BOARDS = 8;
const MAX_RECENT_THREADS = 8;
const MAX_RECENT_POSTS = 12;

interface DashboardClientProps {
  initialUsers: Array<{
    id: number;
    username: string;
    email: string;
    isActive: boolean;
    isAdmin: boolean;
    isAdultVerified: boolean;
    createdAt: Date;
  }>;
  initialBoards: Array<{
    id: number;
    boardKey: string;
    name: string;
    isHidden: boolean;
    isArchive: boolean;
    isAdultOnly: boolean;
    updatedAt: Date;
    _count: { threads: number };
  }>;
  initialThreads: Array<{
    id: number;
    threadIndex: number;
    title: string;
    postCount: number;
    isHidden: boolean;
    isChat: boolean;
    isAdultOnly: boolean;
    isArchive: boolean;
    postUpdatedAt: Date;
    board: { boardKey: string; name: string };
  }>;
  initialPosts: Array<{
    id: number;
    postOrder: number;
    author: string;
    contentType: string;
    isHidden: boolean;
    isAutoPost: boolean;
    createdAt: Date;
    thread: {
      threadIndex: number;
      title: string;
      board: { boardKey: string; name: string };
    };
  }>;
  initialPostsLoaded: boolean;
  stats: {
    usersTotal: number;
    usersActive: number;
    usersAdmin: number;
    boardsTotal: number;
    boardsHidden: number;
    threadsTotal: number;
    threadsHidden: number;
    threadsChat: number;
    threadsAdult: number;
    postsTotal: number;
    postsHidden: number;
    postsAuto: number;
    recentAuditLogs: Array<{
      id: number;
      action: string;
      targetType: string;
      summary: string;
      createdAt: Date;
      adminUser: { username: string; email: string };
    }>;
  };
  filteredCounts: {
    usersFilteredTotal: number;
    boardsFilteredTotal: number;
    threadsFilteredTotal: number;
    postsFilteredTotal: number;
  };
}

function formatDateTime(value: Date): string {
  return new Date(value).toLocaleString("ko-KR", {
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

function renderPagination(
  page: number,
  totalPages: number,
  onPrev: () => void,
  onNext: () => void,
) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
      <p>
        페이지 {formatNumber(page)} / {formatNumber(totalPages)}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <button
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

export default function DashboardClient({
  initialUsers,
  initialBoards,
  initialThreads,
  initialPosts,
  initialPostsLoaded,
  stats,
  filteredCounts,
}: DashboardClientProps) {
  // Filters
  const [userQuery, setUserQuery] = useState("");
  const [userStatus, setUserStatus] = useState("all");
  const [userRole, setUserRole] = useState("all");
  const [boardQuery, setBoardQuery] = useState("");
  const [boardVisibility, setBoardVisibility] = useState("all");
  const [threadQuery, setThreadQuery] = useState("");
  const [threadVisibility, setThreadVisibility] = useState("all");
  const [threadType, setThreadType] = useState("all");
  const [postQuery, setPostQuery] = useState("");
  const [postVisibility, setPostVisibility] = useState("all");
  const [postAuto, setPostAuto] = useState("all");

  // Pagination
  const [usersPage, setUsersPage] = useState(1);
  const [boardsPage, setBoardsPage] = useState(1);
  const [threadsPage, setThreadsPage] = useState(1);
  const [postsPage, setPostsPage] = useState(1);

  // Data
  const [recentUsers, setRecentUsers] = useState(initialUsers);
  const [recentBoards, setRecentBoards] = useState(initialBoards);
  const [recentThreads, setRecentThreads] = useState(initialThreads);
  const [recentPosts, setRecentPosts] = useState(initialPosts);
  const [usersFilteredTotal, setUsersFilteredTotal] = useState(
    filteredCounts.usersFilteredTotal,
  );
  const [boardsFilteredTotal, setBoardsFilteredTotal] = useState(
    filteredCounts.boardsFilteredTotal,
  );
  const [threadsFilteredTotal, setThreadsFilteredTotal] = useState(
    filteredCounts.threadsFilteredTotal,
  );
  const [postsFilteredTotal, setPostsFilteredTotal] = useState(
    filteredCounts.postsFilteredTotal,
  );

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const isFirstFetchRef = useRef(true);

  // Calculate total pages
  const usersTotalPages = Math.max(
    1,
    Math.ceil(usersFilteredTotal / MAX_RECENT_USERS),
  );
  const boardsTotalPages = Math.max(
    1,
    Math.ceil(boardsFilteredTotal / MAX_RECENT_BOARDS),
  );
  const threadsTotalPages = Math.max(
    1,
    Math.ceil(threadsFilteredTotal / MAX_RECENT_THREADS),
  );
  const postsTotalPages = Math.max(
    1,
    Math.ceil(postsFilteredTotal / MAX_RECENT_POSTS),
  );

  // Fetch data based on filters and pagination
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (userQuery) params.set("userQuery", userQuery);
      if (userStatus !== "all") params.set("userStatus", userStatus);
      if (userRole !== "all") params.set("userRole", userRole);
      if (boardQuery) params.set("boardQuery", boardQuery);
      if (boardVisibility !== "all") params.set("boardVisibility", boardVisibility);
      if (threadQuery) params.set("threadQuery", threadQuery);
      if (threadVisibility !== "all") params.set("threadVisibility", threadVisibility);
      if (threadType !== "all") params.set("threadType", threadType);
      if (postQuery) params.set("postQuery", postQuery);
      if (postVisibility !== "all") params.set("postVisibility", postVisibility);
      if (postAuto !== "all") params.set("postAuto", postAuto);
      params.set("usersPage", String(usersPage));
      params.set("boardsPage", String(boardsPage));
      params.set("threadsPage", String(threadsPage));
      params.set("postsPage", String(postsPage));

      const response = await fetch(`/api/admin/dashboard?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();
      setRecentUsers(data.recentUsers);
      setRecentBoards(data.recentBoards);
      setRecentThreads(data.recentThreads);
      setRecentPosts(data.recentPosts);
      setUsersFilteredTotal(data.usersFilteredTotal);
      setBoardsFilteredTotal(data.boardsFilteredTotal);
      setThreadsFilteredTotal(data.threadsFilteredTotal);
      setPostsFilteredTotal(data.postsFilteredTotal);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    userQuery,
    userStatus,
    userRole,
    boardQuery,
    boardVisibility,
    threadQuery,
    threadVisibility,
    threadType,
    postQuery,
    postVisibility,
    postAuto,
    usersPage,
    boardsPage,
    threadsPage,
    postsPage,
  ]);

  // Fetch data when filters or pagination change
  useEffect(() => {
    if (isFirstFetchRef.current) {
      isFirstFetchRef.current = false;
      if (initialPostsLoaded) {
        return;
      }
    }

    void fetchData();
  }, [fetchData, initialPostsLoaded]);

  // API call functions
  const callToggleApi = async (
    endpoint: string,
    payload: Record<string, number>,
  ) => {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      await fetchData();
    } catch (error) {
      console.error("API call failed:", error);
    }
  };

  const handleToggleUserActive = (userId: number) =>
    callToggleApi("/api/admin/toggle-user-active", { userId });

  const handleToggleUserAdmin = (userId: number) =>
    callToggleApi("/api/admin/toggle-user-admin", { userId });

  const handleToggleBoardHidden = (boardId: number) =>
    callToggleApi("/api/admin/toggle-board-hidden", { boardId });

  const handleToggleThreadHidden = (threadId: number) =>
    callToggleApi("/api/admin/toggle-thread-hidden", { threadId });

  const handleTogglePostHidden = (postId: number) =>
    callToggleApi("/api/admin/toggle-post-hidden", { postId });

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setUsersPage(1);
    setBoardsPage(1);
    setThreadsPage(1);
    setPostsPage(1);
  };

  const handleResetFilters = () => {
    setUserQuery("");
    setUserStatus("all");
    setUserRole("all");
    setBoardQuery("");
    setBoardVisibility("all");
    setThreadQuery("");
    setThreadVisibility("all");
    setThreadType("all");
    setPostQuery("");
    setPostVisibility("all");
    setPostAuto("all");
    setUsersPage(1);
    setBoardsPage(1);
    setThreadsPage(1);
    setPostsPage(1);
  };

  const statCards = [
    {
      title: "유저",
      primary: formatNumber(stats.usersTotal),
      detail: `활성 ${formatNumber(stats.usersActive)} / 관리자 ${formatNumber(stats.usersAdmin)}`,
      tone: "from-sky-500 to-cyan-500",
    },
    {
      title: "게시판",
      primary: formatNumber(stats.boardsTotal),
      detail: `숨김 ${formatNumber(stats.boardsHidden)}`,
      tone: "from-emerald-500 to-lime-500",
    },
    {
      title: "스레드",
      primary: formatNumber(stats.threadsTotal),
      detail: `숨김 ${formatNumber(stats.threadsHidden)} / 채팅 ${formatNumber(stats.threadsChat)} / 성인 ${formatNumber(stats.threadsAdult)}`,
      tone: "from-amber-500 to-orange-500",
    },
    {
      title: "레스",
      primary: formatNumber(stats.postsTotal),
      detail: `숨김 ${formatNumber(stats.postsHidden)} / 자동 ${formatNumber(stats.postsAuto)}`,
      tone: "from-rose-500 to-pink-500",
    },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Search and Filter Section */}
      <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">검색 및 필터</h2>
            <p className="text-xs text-slate-500">
              유저, 게시판, 스레드, 레스 목록을 조건별로 좁혀서 관리할 수 있습니다.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            필터 초기화
          </button>
        </div>

        <form onSubmit={handleApplyFilters} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="유저 검색 (닉네임/이메일)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={userStatus}
            onChange={(e) => setUserStatus(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">유저 상태: 전체</option>
            <option value="active">유저 상태: 활성</option>
            <option value="inactive">유저 상태: 비활성</option>
          </select>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">유저 권한: 전체</option>
            <option value="admin">유저 권한: 관리자</option>
            <option value="user">유저 권한: 일반</option>
          </select>
          <input
            type="text"
            value={boardQuery}
            onChange={(e) => setBoardQuery(e.target.value)}
            placeholder="게시판 검색 (이름/키)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={boardVisibility}
            onChange={(e) => setBoardVisibility(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">게시판 공개: 전체</option>
            <option value="visible">게시판 공개: 공개</option>
            <option value="hidden">게시판 공개: 숨김</option>
          </select>
          <input
            type="text"
            value={threadQuery}
            onChange={(e) => setThreadQuery(e.target.value)}
            placeholder="스레드 검색 (제목/작성자)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={threadVisibility}
            onChange={(e) => setThreadVisibility(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">스레드 공개: 전체</option>
            <option value="visible">스레드 공개: 공개</option>
            <option value="hidden">스레드 공개: 숨김</option>
          </select>
          <select
            value={threadType}
            onChange={(e) => setThreadType(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">스레드 타입: 전체</option>
            <option value="serial">스레드 타입: 연재</option>
            <option value="chat">스레드 타입: 채팅</option>
          </select>
          <input
            type="text"
            value={postQuery}
            onChange={(e) => setPostQuery(e.target.value)}
            placeholder="레스 검색 (작성자/스레드 제목)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={postVisibility}
            onChange={(e) => setPostVisibility(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">레스 공개: 전체</option>
            <option value="visible">레스 공개: 공개</option>
            <option value="hidden">레스 공개: 숨김</option>
          </select>
          <select
            value={postAuto}
            onChange={(e) => setPostAuto(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">레스 유형: 전체</option>
            <option value="manual">레스 유형: 수동</option>
            <option value="auto">레스 유형: 자동</option>
          </select>

          <div className="sm:col-span-2 xl:col-span-4">
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md border border-sky-700 bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {isLoading ? "로드 중..." : "필터 적용"}
            </button>
          </div>
        </form>
      </section>

      {/* Stats Section */}
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

      {/* Detail Management Links */}
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

      {/* Audit Logs Section */}
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
              {stats.recentAuditLogs.map((log) => (
                <tr key={log.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {log.adminUser.username} ({log.adminUser.email})
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                    {log.action}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{log.targetType}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Users Management Section */}
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
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            user.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {user.isActive ? "활성" : "비활성"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            user.isAdmin
                              ? "bg-sky-100 text-sky-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {user.isAdmin ? "관리자" : "일반"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            user.isAdultVerified
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {user.isAdultVerified ? "성인인증" : "미인증"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleToggleUserActive(user.id)}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {user.isActive ? "비활성화" : "활성화"}
                        </button>

                        <button
                          onClick={() => handleToggleUserAdmin(user.id)}
                          className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
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

          {renderPagination(
            usersPage,
            usersTotalPages,
            () => setUsersPage((p) => Math.max(1, p - 1)),
            () => setUsersPage((p) => p + 1),
          )}
        </article>

        {/* Boards Management Section */}
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
                      <Link
                        href={`/board/${board.boardKey}`}
                        className="font-semibold text-slate-900 hover:text-sky-700"
                      >
                        {board.name}
                      </Link>
                      <p className="text-xs text-slate-500">/{board.boardKey}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            board.isHidden
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {board.isHidden ? "숨김" : "공개"}
                        </span>
                        {board.isArchive ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                            아카이브
                          </span>
                        ) : null}
                        {board.isAdultOnly ? (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">
                            성인전용
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                      {formatNumber(board._count.threads)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(board.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleToggleBoardHidden(board.id)}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {board.isHidden ? "공개" : "숨김"}
                        </button>
                        <Link
                          href={`/board/${board.boardKey}`}
                          className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                        >
                          이동
                        </Link>
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
            () => setBoardsPage((p) => Math.max(1, p - 1)),
            () => setBoardsPage((p) => p + 1),
          )}
        </article>
      </section>

      {/* Threads and Posts Management Section */}
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
                        <Link
                          href={threadHref}
                          className="font-semibold text-slate-900 hover:text-sky-700"
                        >
                          {thread.title}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {thread.board.name} / #{thread.threadIndex}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              thread.isHidden
                                ? "bg-rose-100 text-rose-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {thread.isHidden ? "숨김" : "공개"}
                          </span>
                          {thread.isChat ? (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
                              채팅
                            </span>
                          ) : null}
                          {thread.isAdultOnly ? (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">
                              성인전용
                            </span>
                          ) : null}
                          {thread.isArchive ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                              아카이브
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                        {formatNumber(thread.postCount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDateTime(thread.postUpdatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleToggleThreadHidden(thread.id)}
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {thread.isHidden ? "공개" : "숨김"}
                          </button>
                          <Link
                            href={threadHref}
                            className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                          >
                            이동
                          </Link>
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
            () => setThreadsPage((p) => Math.max(1, p - 1)),
            () => setThreadsPage((p) => p + 1),
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
                        <Link
                          href={postThreadHref}
                          className="font-semibold text-slate-900 hover:text-sky-700"
                        >
                          {post.thread.board.name} / #{post.thread.threadIndex} / 레스 {post.postOrder}
                        </Link>
                        <p className="text-xs text-slate-500">
                          작성자 {post.author} · 타입 {post.contentType}
                        </p>
                        <p className="line-clamp-1 text-xs text-slate-500">
                          {post.thread.title}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              post.isHidden
                                ? "bg-rose-100 text-rose-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {post.isHidden ? "숨김" : "공개"}
                          </span>
                          {post.isAutoPost ? (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
                              자동
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDateTime(post.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleTogglePostHidden(post.id)}
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {post.isHidden ? "공개" : "숨김"}
                          </button>
                          <Link
                            href={postThreadHref}
                            className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                          >
                            스레드 이동
                          </Link>
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
            () => setPostsPage((p) => Math.max(1, p - 1)),
            () => setPostsPage((p) => p + 1),
          )}
        </article>
      </section>
    </div>
  );
}
