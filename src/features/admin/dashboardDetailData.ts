import type { Prisma } from "@/generated/prisma/client";

import prisma from "@/lib/prisma";

type ParamSource =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

export const DETAIL_PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export interface UsersFilters {
  query: string;
  status: string;
  role: string;
}

export interface BoardsFilters {
  query: string;
  visibility: string;
  category: string;
}

export interface ThreadsFilters {
  query: string;
  visibility: string;
  threadType: string;
  adult: string;
}

export interface PostsFilters {
  query: string;
  visibility: string;
  autoType: string;
  contentType: string;
}

export interface UsersPageData {
  filters: UsersFilters;
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  filteredTotal: number;
  activeCount: number;
  adminCount: number;
  users: Array<{
    id: number;
    username: string;
    email: string;
    isActive: boolean;
    isAdmin: boolean;
    isAdultVerified: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
    _count: {
      posts: number;
      threadsOwned: number;
    };
  }>;
}

export interface BoardsPageData {
  filters: BoardsFilters;
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  filteredTotal: number;
  hiddenCount: number;
  archiveCount: number;
  boards: Array<{
    id: number;
    boardKey: string;
    name: string;
    description: string | null;
    isHidden: boolean;
    isBasic: boolean;
    isArchive: boolean;
    isAdultOnly: boolean;
    updatedAt: Date | string;
    createdAt: Date | string;
    _count: {
      threads: number;
      collaborators: number;
      joinedUsers: number;
    };
  }>;
}

export interface ThreadsPageData {
  filters: ThreadsFilters;
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  filteredTotal: number;
  hiddenCount: number;
  chatCount: number;
  threads: Array<{
    id: number;
    threadIndex: number;
    title: string;
    author: string;
    postCount: number;
    postLimit: number;
    isHidden: boolean;
    isChat: boolean;
    isAdultOnly: boolean;
    isArchive: boolean;
    createdAt: Date | string;
    postUpdatedAt: Date | string;
    board: {
      boardKey: string;
      name: string;
    };
    _count: {
      posts: number;
    };
  }>;
}

export interface PostsPageData {
  filters: PostsFilters;
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  filteredTotal: number;
  hiddenCount: number;
  autoCount: number;
  posts: Array<{
    id: number;
    postOrder: number;
    author: string;
    contentType: string;
    isHidden: boolean;
    isAutoPost: boolean;
    createdAt: Date | string;
    postUpdatedAt: Date | string;
    thread: {
      id: number;
      threadIndex: number;
      title: string;
      board: {
        boardKey: string;
        name: string;
      };
    };
  }>;
}

function getParam(source: ParamSource, key: string): string {
  if (source instanceof URLSearchParams) {
    return source.get(key) ?? "";
  }

  const value = source[key];
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function getPageSize(value: string, fallback = 20): number {
  const parsed = parsePositiveInt(value, fallback);
  return DETAIL_PAGE_SIZE_OPTIONS.includes(
    parsed as (typeof DETAIL_PAGE_SIZE_OPTIONS)[number],
  )
    ? parsed
    : fallback;
}

export function parseUsersQuery(source: ParamSource) {
  return {
    query: getParam(source, "query").trim(),
    status: getParam(source, "status") || "all",
    role: getParam(source, "role") || "all",
    page: parsePositiveInt(getParam(source, "page"), 1),
    pageSize: getPageSize(getParam(source, "pageSize"), 20),
  };
}

export function parseBoardsQuery(source: ParamSource) {
  return {
    query: getParam(source, "query").trim(),
    visibility: getParam(source, "visibility") || "all",
    category: getParam(source, "category") || "all",
    page: parsePositiveInt(getParam(source, "page"), 1),
    pageSize: getPageSize(getParam(source, "pageSize"), 20),
  };
}

export function parseThreadsQuery(source: ParamSource) {
  return {
    query: getParam(source, "query").trim(),
    visibility: getParam(source, "visibility") || "all",
    threadType: getParam(source, "threadType") || "all",
    adult: getParam(source, "adult") || "all",
    page: parsePositiveInt(getParam(source, "page"), 1),
    pageSize: getPageSize(getParam(source, "pageSize"), 20),
  };
}

export function parsePostsQuery(source: ParamSource) {
  return {
    query: getParam(source, "query").trim(),
    visibility: getParam(source, "visibility") || "all",
    autoType: getParam(source, "autoType") || "all",
    contentType: getParam(source, "contentType") || "all",
    page: parsePositiveInt(getParam(source, "page"), 1),
    pageSize: getPageSize(getParam(source, "pageSize"), 20),
  };
}

export async function getUsersPageData(
  input: ReturnType<typeof parseUsersQuery>,
): Promise<UsersPageData> {
  const where: Prisma.UserWhereInput = {
    ...(input.status === "active" ? { isActive: true } : {}),
    ...(input.status === "inactive" ? { isActive: false } : {}),
    ...(input.role === "admin" ? { isAdmin: true } : {}),
    ...(input.role === "user" ? { isAdmin: false } : {}),
    ...(input.query
      ? {
          OR: [
            { username: { contains: input.query } },
            { email: { contains: input.query } },
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

  const totalPages = Math.max(1, Math.ceil(filteredTotal / input.pageSize));
  const page = Math.min(input.page, totalPages);
  const skip = (page - 1) * input.pageSize;

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: input.pageSize,
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

  return {
    filters: {
      query: input.query,
      status: input.status,
      role: input.role,
    },
    page,
    pageSize: input.pageSize,
    totalPages,
    total,
    filteredTotal,
    activeCount,
    adminCount,
    users,
  };
}

export async function getBoardsPageData(
  input: ReturnType<typeof parseBoardsQuery>,
): Promise<BoardsPageData> {
  const where: Prisma.BoardWhereInput = {
    ...(input.visibility === "visible" ? { isHidden: false } : {}),
    ...(input.visibility === "hidden" ? { isHidden: true } : {}),
    ...(input.category === "archive" ? { isArchive: true } : {}),
    ...(input.category === "basic" ? { isBasic: true } : {}),
    ...(input.category === "adult" ? { isAdultOnly: true } : {}),
    ...(input.query
      ? {
          OR: [
            { name: { contains: input.query } },
            { boardKey: { contains: input.query } },
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

  const totalPages = Math.max(1, Math.ceil(filteredTotal / input.pageSize));
  const page = Math.min(input.page, totalPages);
  const skip = (page - 1) * input.pageSize;

  const boards = await prisma.board.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip,
    take: input.pageSize,
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

  return {
    filters: {
      query: input.query,
      visibility: input.visibility,
      category: input.category,
    },
    page,
    pageSize: input.pageSize,
    totalPages,
    total,
    filteredTotal,
    hiddenCount,
    archiveCount,
    boards,
  };
}

export async function getThreadsPageData(
  input: ReturnType<typeof parseThreadsQuery>,
): Promise<ThreadsPageData> {
  const where: Prisma.ThreadWhereInput = {
    ...(input.visibility === "visible" ? { isHidden: false } : {}),
    ...(input.visibility === "hidden" ? { isHidden: true } : {}),
    ...(input.threadType === "chat" ? { isChat: true } : {}),
    ...(input.threadType === "serial" ? { isChat: false } : {}),
    ...(input.adult === "adult" ? { isAdultOnly: true } : {}),
    ...(input.adult === "normal" ? { isAdultOnly: false } : {}),
    ...(input.query
      ? {
          OR: [
            { title: { contains: input.query } },
            { author: { contains: input.query } },
            { board: { boardKey: { contains: input.query } } },
          ],
        }
      : {}),
  };

  const [total, filteredTotal, hiddenCount, chatCount] = await Promise.all([
    prisma.thread.count(),
    prisma.thread.count({ where }),
    prisma.thread.count({ where: { ...where, isHidden: true } }),
    prisma.thread.count({ where: { ...where, isChat: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTotal / input.pageSize));
  const page = Math.min(input.page, totalPages);
  const skip = (page - 1) * input.pageSize;

  const threads = await prisma.thread.findMany({
    where,
    orderBy: { postUpdatedAt: "desc" },
    skip,
    take: input.pageSize,
    select: {
      id: true,
      threadIndex: true,
      title: true,
      author: true,
      postCount: true,
      postLimit: true,
      isHidden: true,
      isChat: true,
      isAdultOnly: true,
      isArchive: true,
      createdAt: true,
      postUpdatedAt: true,
      board: {
        select: {
          boardKey: true,
          name: true,
        },
      },
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });

  return {
    filters: {
      query: input.query,
      visibility: input.visibility,
      threadType: input.threadType,
      adult: input.adult,
    },
    page,
    pageSize: input.pageSize,
    totalPages,
    total,
    filteredTotal,
    hiddenCount,
    chatCount,
    threads,
  };
}

export async function getPostsPageData(
  input: ReturnType<typeof parsePostsQuery>,
): Promise<PostsPageData> {
  const contentTypeFilter =
    input.contentType === "text" ||
    input.contentType === "aa" ||
    input.contentType === "novel" ||
    input.contentType === "line"
      ? input.contentType
      : null;

  const where: Prisma.PostWhereInput = {
    ...(input.visibility === "visible" ? { isHidden: false } : {}),
    ...(input.visibility === "hidden" ? { isHidden: true } : {}),
    ...(input.autoType === "auto" ? { isAutoPost: true } : {}),
    ...(input.autoType === "manual" ? { isAutoPost: false } : {}),
    ...(contentTypeFilter ? { contentType: contentTypeFilter } : {}),
    ...(input.query
      ? {
          OR: [
            { author: { contains: input.query } },
            { thread: { title: { contains: input.query } } },
            { thread: { board: { boardKey: { contains: input.query } } } },
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

  const totalPages = Math.max(1, Math.ceil(filteredTotal / input.pageSize));
  const page = Math.min(input.page, totalPages);
  const skip = (page - 1) * input.pageSize;

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: input.pageSize,
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

  return {
    filters: {
      query: input.query,
      visibility: input.visibility,
      autoType: input.autoType,
      contentType: input.contentType,
    },
    page,
    pageSize: input.pageSize,
    totalPages,
    total,
    filteredTotal,
    hiddenCount,
    autoCount,
    posts,
  };
}
