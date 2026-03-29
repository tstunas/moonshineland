import type { Metadata } from "next";
import { ThreadLiveClient } from "@/features/board/components/ThreadLiveClient";
import { getCurrentUser } from "@/features/auth/queries";
import { canManageThread } from "@/features/board/lib/canManageThread";
import { getPosts } from "@/features/board/lib/getPosts";
import { getThread } from "@/features/board/lib/getThread";
import { getThreadTitle } from "@/features/board/lib/getThreadTitle";

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    boardKey: string;
    threadIndex: string;
    start: string;
    end: string;
  }>;
}): Promise<Metadata> {
  const { boardKey, threadIndex: threadIndexParam } = await params;
  const threadIndex = Number(threadIndexParam);
  const title = await getThreadTitle(boardKey, threadIndex);
  return { title: title ?? "문샤인랜드" };
}

export default async function ThreadRangePage({
  params,
}: {
  params: Promise<{
    boardKey: string;
    threadIndex: string;
    start: string;
    end: string;
  }>;
}) {
  const {
    boardKey,
    threadIndex: threadIndexParam,
    start: startParam,
    end: endParam,
  } = await params;
  const threadIndex = Number(threadIndexParam);
  const start = Number(startParam);
  const end = Number(endParam);

  if (
    !Number.isInteger(threadIndex) ||
    threadIndex <= 0 ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < 0 ||
    end < start
  ) {
    return (
      <div className="flex h-full items-center justify-center">
        <h1 className="text-2xl font-bold text-slate-900">
          잘못된 범위 요청입니다
        </h1>
      </div>
    );
  }

  const thread = await getThread(boardKey, threadIndex);

  if (!thread) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-gradient-to-b from-sky-50 via-white to-cyan-50 p-12 shadow-lg">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-200">
            <span className="text-5xl">🔍</span>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900">
              존재하지 않는 스레드입니다
            </h1>
            <p className="mt-2 text-slate-600">
              찾고 있는 스레드를 찾을 수 없습니다. 다시 확인해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const visiblePosts = await getPosts(boardKey, threadIndex, {
    mode: "range",
    start,
    end,
    includeZero: true,
  });
  const [canManage, currentUser] = await Promise.all([
    canManageThread(thread.userId ?? null),
    getCurrentUser(),
  ]);

  return (
    <ThreadLiveClient
      boardKey={boardKey}
      initialThread={thread}
      initialPosts={visiblePosts}
      isSignedIn={Boolean(currentUser)}
      mode="range"
      rangeStart={start}
      rangeEnd={end}
      canManageThread={canManage}
    />
  );
}
