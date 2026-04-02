import type { Metadata } from "next";

import { getCurrentUser } from "@/features/auth/queries";
import { forbidden } from "next/navigation";
import prisma from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

const MAX_RECENT_USERS = 8;
const MAX_RECENT_BOARDS = 8;
const MAX_RECENT_THREADS = 8;

function summarizePostStats(
  grouped: Array<{ isHidden: boolean; isAutoPost: boolean; _count: { _all: number } }>,
) {
  let postsTotal = 0;
  let postsHidden = 0;
  let postsAuto = 0;

  for (const row of grouped) {
    const count = row._count._all;
    postsTotal += count;
    if (row.isHidden) {
      postsHidden += count;
    }
    if (row.isAutoPost) {
      postsAuto += count;
    }
  }

  return {
    postsTotal,
    postsHidden,
    postsAuto,
  };
}

export const metadata: Metadata = {
  title: "문샤인랜드: 관리자 대시보드",
};

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

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await requireAdminUserId();

  // Fetch initial stats and data
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
    postGroups,
    recentAuditLogs,
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
    prisma.post.groupBy({
      by: ["isHidden", "isAutoPost"],
      _count: {
        _all: true,
      },
    }),
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
  ]);

  const { postsTotal, postsHidden, postsAuto } = summarizePostStats(postGroups);

  // Fetch initial data (page 1, no filters). Posts are loaded after mount to avoid heavy SSR query.
  const [recentUsers, recentBoards, recentThreads] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip: 0,
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
      orderBy: { updatedAt: "desc" },
      skip: 0,
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
      orderBy: { postUpdatedAt: "desc" },
      skip: 0,
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
        postUpdatedAt: true,
        board: {
          select: {
            boardKey: true,
            name: true,
          },
        },
      },
    }),
  ]);

  return (
    <DashboardClient
      initialUsers={recentUsers}
      initialBoards={recentBoards}
      initialThreads={recentThreads}
      initialPosts={[]}
      initialPostsLoaded={false}
      stats={{
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
      }}
      filteredCounts={{
        usersFilteredTotal: usersTotal,
        boardsFilteredTotal: boardsTotal,
        threadsFilteredTotal: threadsTotal,
        postsFilteredTotal: postsTotal,
      }}
    />
  );
}
