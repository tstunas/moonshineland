import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

import { getCurrentUser } from "@/features/auth/queries";
import prisma from "@/lib/prisma";

const MAX_RECENT_USERS = 8;
const MAX_RECENT_BOARDS = 8;
const MAX_RECENT_THREADS = 8;
const MAX_RECENT_POSTS = 12;

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;

    // Parse filters
    const userQuery = searchParams.get("userQuery")?.trim() || "";
    const userStatus = searchParams.get("userStatus") || "all";
    const userRole = searchParams.get("userRole") || "all";
    const boardQuery = searchParams.get("boardQuery")?.trim() || "";
    const boardVisibility = searchParams.get("boardVisibility") || "all";
    const threadQuery = searchParams.get("threadQuery")?.trim() || "";
    const threadVisibility = searchParams.get("threadVisibility") || "all";
    const threadType = searchParams.get("threadType") || "all";
    const postQuery = searchParams.get("postQuery")?.trim() || "";
    const postVisibility = searchParams.get("postVisibility") || "all";
    const postAuto = searchParams.get("postAuto") || "all";

    // Parse pagination
    const usersPage = Math.max(1, Number(searchParams.get("usersPage")) || 1);
    const boardsPage = Math.max(1, Number(searchParams.get("boardsPage")) || 1);
    const threadsPage = Math.max(1, Number(searchParams.get("threadsPage")) || 1);
    const postsPage = Math.max(1, Number(searchParams.get("postsPage")) || 1);

    // Build where clauses
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

    // Count filtered results
    const [
      usersFilteredTotal,
      boardsFilteredTotal,
      threadsFilteredTotal,
      postsFilteredTotal,
    ] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.board.count({ where: boardWhere }),
      prisma.thread.count({ where: threadWhere }),
      prisma.post.count({ where: postWhere }),
    ]);

    // Calculate valid pages
    const usersTotalPages = Math.max(1, Math.ceil(usersFilteredTotal / MAX_RECENT_USERS));
    const boardsTotalPages = Math.max(1, Math.ceil(boardsFilteredTotal / MAX_RECENT_BOARDS));
    const threadsTotalPages = Math.max(1, Math.ceil(threadsFilteredTotal / MAX_RECENT_THREADS));
    const postsTotalPages = Math.max(1, Math.ceil(postsFilteredTotal / MAX_RECENT_POSTS));

    const validUsersPage = Math.min(usersPage, usersTotalPages);
    const validBoardsPage = Math.min(boardsPage, boardsTotalPages);
    const validThreadsPage = Math.min(threadsPage, threadsTotalPages);
    const validPostsPage = Math.min(postsPage, postsTotalPages);

    // Calculate skips
    const usersSkip = (validUsersPage - 1) * MAX_RECENT_USERS;
    const boardsSkip = (validBoardsPage - 1) * MAX_RECENT_BOARDS;
    const threadsSkip = (validThreadsPage - 1) * MAX_RECENT_THREADS;
    const postsSkip = (validPostsPage - 1) * MAX_RECENT_POSTS;

    // Fetch data
    const [recentUsers, recentBoards, recentThreads, recentPosts] =
      await Promise.all([
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
          orderBy: { postUpdatedAt: "desc" },
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
            postUpdatedAt: true,
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

    return NextResponse.json({
      recentUsers,
      recentBoards,
      recentThreads,
      recentPosts,
      usersFilteredTotal,
      boardsFilteredTotal,
      threadsFilteredTotal,
      postsFilteredTotal,
    });
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
