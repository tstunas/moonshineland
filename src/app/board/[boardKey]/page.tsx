import type { Metadata } from "next";
import { BoardThreadFilters } from "@/features/board/components/BoardThreadFilters";
import { ThreadForm } from "@/features/board/components/ThreadForm";
import { ThreadItem } from "@/features/board/components/ThreadItem";
import { ThreadPagination } from "@/features/board/components/ThreadPagination";
import { BoardPresenceClient } from "@/features/board/components/BoardPresenceClient";
import { LatestBoardAnnouncement } from "@/features/announcement/components/LatestBoardAnnouncement";
import { getNextThreadIndex } from "@/features/board/lib/getNextThreadIndex";
import { getThreads } from "@/features/board/lib/getThreads";
import { getTotalThreads } from "@/features/board/lib/getTotalThreads";
import { getCurrentUser } from "@/features/auth/queries";
import { BOARDS } from "@/lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ boardKey: string }>;
}): Promise<Metadata> {
  const { boardKey } = await params;
  const board = BOARDS.find((b) => b.key === boardKey);
  return {
    title: board ? `문샤인랜드: ${board.label}` : "문샤인랜드",
  };
}

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardKey: string }>;
  searchParams: Promise<{
    page?: string;
    threadType?: string;
    includeAdultOnly?: string;
    isChat?: string;
    title?: string;
    author?: string;
  }>;
}) {
  const { boardKey } = await params;
  const { page, threadType, includeAdultOnly, isChat, title, author } =
    await searchParams;

  const board = BOARDS.find((board) => board.key === boardKey);

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-gradient-to-b from-sky-50 via-white to-cyan-50 p-12 shadow-lg">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-200">
            <span className="text-5xl">🔍</span>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900">
              존재하지 않는 게시판입니다
            </h1>
            <p className="mt-2 text-slate-600">
              찾고 있는 게시판을 찾을 수 없습니다. 다시 확인해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const currentUser = await getCurrentUser();
  const isSignedIn = Boolean(currentUser);
  const threadTypeFilter =
    threadType === "chat"
      ? "chat"
      : threadType === "serial"
        ? "serial"
        : isChat === "true"
          ? "chat"
          : isChat === "false"
            ? "serial"
            : "all";
  const isChatFilter =
    threadTypeFilter === "all" ? undefined : threadTypeFilter === "chat";
  const includeAdultOnlyThreads = isSignedIn && includeAdultOnly === "true";
  const isAdultOnlyFilter = includeAdultOnlyThreads ? undefined : false;
  const titleFilter = title?.trim() ? title.trim() : undefined;
  const authorFilter = author?.trim() ? author.trim() : undefined;

  const [threadItems, totalThreads, nextThreadIndex] = await Promise.all([
    getThreads(boardKey, {
      page: currentPage,
      isChat: isChatFilter,
      isAdultOnly: isAdultOnlyFilter,
      title: titleFilter,
      author: authorFilter,
    }),
    getTotalThreads(boardKey, {
      isChat: isChatFilter,
      isAdultOnly: isAdultOnlyFilter,
      title: titleFilter,
      author: authorFilter,
    }),
    getNextThreadIndex(boardKey),
  ]);
  const totalPages = Math.ceil(totalThreads / 20);
  const extraQuery = {
    ...(threadTypeFilter !== "all" ? { threadType: threadTypeFilter } : {}),
    ...(includeAdultOnlyThreads ? { includeAdultOnly: "true" } : {}),
    ...(titleFilter ? { title: titleFilter } : {}),
    ...(authorFilter ? { author: authorFilter } : {}),
  };

  return (
    <>
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{board.label}</h1>
        <BoardPresenceClient boardKey={boardKey} />
      </div>
      <div className="mt-6">
        <LatestBoardAnnouncement
          isAdultVerified={Boolean(currentUser?.isAdultVerified)}
        />
      </div>
      <div className="mt-4">
        <BoardThreadFilters
          boardKey={boardKey}
          totalThreads={totalThreads}
          title={titleFilter}
          author={authorFilter}
          includeAdultOnly={includeAdultOnlyThreads}
          threadType={threadTypeFilter}
          isSignedIn={isSignedIn}
          isAdultVerified={Boolean(currentUser?.isAdultVerified)}
        />
      </div>
      <ul className="mt-5 space-y-3">
        {threadItems.length > 0 ? (
          threadItems.map((thread) => (
            <li key={thread.id}>
              <ThreadItem thread={thread} boardKey={boardKey} />
            </li>
          ))
        ) : (
          <li className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500">
            현재 조건에 맞는 스레드가 없습니다.
          </li>
        )}
      </ul>
      <div className="flex justify-center py-6">
        <ThreadPagination
          totalPages={totalPages}
          currentPage={currentPage}
          basePath={`/board/${boardKey}`}
          extraQuery={extraQuery}
        />
      </div>
      <ThreadForm
        boardKey={boardKey}
        threadIndex={nextThreadIndex}
        isSignedIn={isSignedIn}
        isAdultVerified={Boolean(currentUser?.isAdultVerified)}
      />
    </>
  );
}
