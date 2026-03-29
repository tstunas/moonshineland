import prisma from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Post, PostWithImages } from "@/types/post";
import type { Thread } from "@/types/thread";

export type ThreadListFilters = {
  boardKey: string;
  page?: number;
  pageSize?: number;
  isChat?: boolean;
  isAdultOnly?: boolean;
  title?: string;
  author?: string;
};

export type ThreadListResult = {
  threads: Thread[];
  total: number;
  page: number;
  pageSize: number;
};

export type PostListMode = "recent" | "all" | "range";

export type PostListFilters = {
  boardKey: string;
  threadIndex: number;
  mode?: PostListMode;
  start?: number;
  end?: number;
  includeZero?: boolean;
};

function normalizePage(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.trunc(value));
}

function normalizePageSize(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) return 20;
  return Math.max(1, Math.min(100, Math.trunc(value)));
}

type BoardViewerAuth = {
  userId: number;
  isAdultVerified: boolean;
};

function redirectToLogin(nextPath: string): never {
  redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}

function stripAdultRelatedQuery(nextPath: string): string {
  const [pathname, queryString] = nextPath.split("?", 2);
  if (!queryString) {
    return nextPath;
  }

  const params = new URLSearchParams(queryString);
  params.delete("includeAdultOnly");
  params.delete("isAdultOnly");

  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function redirectToAdultRequired(
  nextPath: string,
  options?: { clearAdultFilter?: boolean },
): never {
  const sanitizedNextPath = stripAdultRelatedQuery(nextPath);
  const params = new URLSearchParams({
    next: sanitizedNextPath,
  });

  if (options?.clearAdultFilter) {
    params.set("clearAdultFilter", "1");
  }

  redirect(`/adult-required?${params.toString()}`);
}

async function getBoardViewerAuth(): Promise<BoardViewerAuth | null> {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(token);
    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      return null;
    }

    return {
      userId,
      isAdultVerified: payload.isAdultVerified === true,
    };
  } catch {
    return null;
  }
}

function ensureAdultAccessOrRedirect(
  viewer: BoardViewerAuth | null,
  nextPath: string,
  options?: { clearAdultFilter?: boolean },
) {
  if (!viewer) {
    redirectToLogin(nextPath);
  }

  if (!viewer.isAdultVerified) {
    redirectToAdultRequired(nextPath, options);
  }
}

function buildBoardListPath(filters: ThreadListFilters): string {
  const params = new URLSearchParams();

  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }

  if (typeof filters.isChat === "boolean") {
    params.set("threadType", filters.isChat ? "chat" : "serial");
  }

  if (filters.isAdultOnly !== false) {
    params.set("includeAdultOnly", "true");
  }

  if (filters.title?.trim()) {
    params.set("title", filters.title.trim());
  }

  if (filters.author?.trim()) {
    params.set("author", filters.author.trim());
  }

  const query = params.toString();
  return query ? `/board/${filters.boardKey}?${query}` : `/board/${filters.boardKey}`;
}

async function resolveViewerUserIdFromAccessToken(): Promise<number | null> {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) return null;

  try {
    const payload = await verifyAccessToken(token);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) return null;
    return userId;
  } catch {
    // 토큰이 없거나 유효하지 않으면 비로그인처럼 처리
    return null;
  }
}

export async function getThreadListQuery(
  filters: ThreadListFilters,
): Promise<ThreadListResult> {
  const nextPath = buildBoardListPath(filters);
  const viewer = await getBoardViewerAuth();

  if (filters.isAdultOnly !== false) {
    ensureAdultAccessOrRedirect(viewer, nextPath, { clearAdultFilter: true });
  }

  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize ?? 20);
  const skip = (page - 1) * pageSize;

  const title = filters.title?.trim();
  const author = filters.author?.trim();

  const where = {
    board: {
      boardKey: filters.boardKey,
    },
    ...(typeof filters.isChat === "boolean" ? { isChat: filters.isChat } : {}),
    ...(typeof filters.isAdultOnly === "boolean"
      ? { isAdultOnly: filters.isAdultOnly }
      : {}),
    ...(title ? { title: { contains: title } } : {}),
    ...(author ? { author: { contains: author } } : {}),
  };

  const [threads, total] = await Promise.all([
    prisma.thread.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { threadIndex: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.thread.count({ where }),
  ]);

  if (threads.some((thread) => thread.isAdultOnly)) {
    ensureAdultAccessOrRedirect(viewer, nextPath, { clearAdultFilter: true });
  }

  return {
    threads,
    total,
    page,
    pageSize,
  };
}

export async function getThreadQuery(
  boardKey: string,
  threadIndex: number,
): Promise<Thread | null> {
  if (!Number.isInteger(threadIndex) || threadIndex <= 0) {
    return null;
  }

  const nextPath = `/board/${boardKey}/${threadIndex}`;
  const viewer = await getBoardViewerAuth();

  return prisma.thread.findFirst({
    where: {
      threadIndex,
      board: {
        boardKey,
      },
    },
  }).then((thread) => {
    if (thread?.isAdultOnly) {
      ensureAdultAccessOrRedirect(viewer, nextPath);
    }
    return thread;
  });
}

const POST_IMAGES_INCLUDE = {
  postImages: { orderBy: { sortOrder: "asc" as const }, select: { id: true, imageUrl: true, sortOrder: true } },
} as const;

export async function getPostListQuery(filters: PostListFilters): Promise<PostWithImages[]> {
  const nextPath = `/board/${filters.boardKey}/${filters.threadIndex}`;
  const viewer = await getBoardViewerAuth();
  const viewerUserId = viewer?.userId ?? null;

  const thread = await prisma.thread.findFirst({
    where: {
      threadIndex: filters.threadIndex,
      board: {
        boardKey: filters.boardKey,
      },
    },
    select: {
      id: true,
      userId: true,
      isAdultOnly: true,
    },
  });

  if (!thread) {
    return [];
  }

  if (thread.isAdultOnly) {
    ensureAdultAccessOrRedirect(viewer, nextPath);
  }

  const mode = filters.mode ?? "all";
  const includeZero = filters.includeZero ?? true;
  const canViewHiddenPosts = viewerUserId === thread.userId;
  const visibilityWhere = canViewHiddenPosts ? {} : { isHidden: false };

  let posts: PostWithImages[] = [];

  if (mode === "recent") {
    const recent = await prisma.post.findMany({
      where: {
        threadId: thread.id,
        ...visibilityWhere,
      },
      orderBy: { postOrder: "desc" },
      take: 50,
      include: POST_IMAGES_INCLUDE,
    });
    posts = [...recent].sort((a, b) => a.postOrder - b.postOrder);
  } else if (mode === "range") {
    const hasStart = typeof filters.start === "number" && Number.isInteger(filters.start);
    const hasEnd = typeof filters.end === "number" && Number.isInteger(filters.end);

    let minOrder = 0;
    let maxOrder = 0;

    if (hasStart && hasEnd) {
      minOrder = Math.min(filters.start!, filters.end!);
      maxOrder = Math.max(filters.start!, filters.end!);
    } else if (hasStart) {
      minOrder = filters.start!;
      maxOrder = filters.start!;
    }

    posts = await prisma.post.findMany({
      where: {
        threadId: thread.id,
        ...visibilityWhere,
        ...(hasStart
          ? {
              postOrder: {
                gte: minOrder,
                lte: maxOrder,
              },
            }
          : {}),
      },
      orderBy: { postOrder: "asc" },
      include: POST_IMAGES_INCLUDE,
    });
  } else {
    posts = await prisma.post.findMany({
      where: {
        threadId: thread.id,
        ...visibilityWhere,
      },
      orderBy: { postOrder: "asc" },
      include: POST_IMAGES_INCLUDE,
    });
  }

  if (!includeZero || posts.some((post) => post.postOrder === 0)) {
    return posts;
  }

  const zeroPost = await prisma.post.findFirst({
    where: {
      threadId: thread.id,
      postOrder: 0,
      ...visibilityWhere,
    },
    include: POST_IMAGES_INCLUDE,
  });

  if (!zeroPost) {
    return posts;
  }

  return [zeroPost, ...posts]
    .filter(
      (post, index, array) =>
        array.findIndex((candidate) => candidate.id === post.id) === index,
    )
    .sort((a, b) => a.postOrder - b.postOrder);
}

export async function getPostsAfterOrderQuery(
  boardKey: string,
  threadIndex: number,
  lastPostOrder: number,
): Promise<PostWithImages[]> {
  const nextPath = `/board/${boardKey}/${threadIndex}`;
  const viewer = await getBoardViewerAuth();

  const thread = await prisma.thread.findFirst({
    where: {
      threadIndex,
      board: {
        boardKey,
      },
    },
    select: {
      id: true,
      isAdultOnly: true,
    },
  });

  if (!thread) {
    return [];
  }

  if (thread.isAdultOnly) {
    ensureAdultAccessOrRedirect(viewer, nextPath);
  }

  return prisma.post.findMany({
    where: {
      threadId: thread.id,
      postOrder: {
        gt: Math.max(-1, Math.trunc(lastPostOrder)),
      },
    },
    orderBy: {
      postOrder: "asc",
    },
    include: POST_IMAGES_INCLUDE,
  });
}

export async function getPostEditHistoryByPostIdQuery(postId: number) {
  return prisma.postContentHistory.findMany({
    where: {
      postId,
    },
    orderBy: {
      id: "desc",
    },
  });
}
