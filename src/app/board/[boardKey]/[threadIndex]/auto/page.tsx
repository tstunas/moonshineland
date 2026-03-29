import type { Metadata } from "next";

import { getCurrentUser } from "@/features/auth/queries";
import { AutoPostManagerClient } from "@/features/board/components/AutoPostManagerClient";
import { getThread } from "@/features/board/lib/getThread";
import { getThreadTitle } from "@/features/board/lib/getThreadTitle";
import prisma from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ boardKey: string; threadIndex: string }>;
}): Promise<Metadata> {
  const { boardKey, threadIndex: threadIndexParam } = await params;
  const threadIndex = Number(threadIndexParam);
  const title = await getThreadTitle(boardKey, threadIndex);
  return { title: title ? `${title} - 자동투하 관리` : "문샤인랜드" };
}

export default async function AutoThreadPage({
  params,
}: {
  params: Promise<{ boardKey: string; threadIndex: string }>;
}) {
  const { boardKey, threadIndex: threadIndexParam } = await params;
  const threadIndex = Number(threadIndexParam);

  if (!Number.isInteger(threadIndex) || threadIndex <= 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <h1 className="text-2xl font-bold text-slate-900">잘못된 스레드 번호입니다</h1>
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
            <h1 className="text-3xl font-bold text-slate-900">존재하지 않는 스레드입니다</h1>
            <p className="mt-2 text-slate-600">
              찾고 있는 스레드를 찾을 수 없습니다. 다시 확인해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentUser = await getCurrentUser();
  const currentUserId = Number(currentUser?.id ?? 0);
  const isThreadOwner =
    Number.isInteger(currentUserId) &&
    currentUserId > 0 &&
    Boolean(thread.userId) &&
    thread.userId === currentUserId;

  if (!isThreadOwner) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-5 text-center text-rose-800">
          <h1 className="text-2xl font-bold">접근 권한이 없습니다</h1>
          <p className="mt-2 text-sm">
            자동투하레스 조회, 작성, 수정은 스레드 주인만 사용할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  const initialAutoPosts = await prisma.autoPost.findMany({
    where: {
      threadId: thread.id,
    },
    include: {
      autoPostImages: {
        select: {
          id: true,
          imageUrl: true,
          sortOrder: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
    orderBy: {
      autoPostSequence: "asc",
    },
  });

  return (
    <AutoPostManagerClient
      boardKey={boardKey}
      threadIndex={threadIndex}
      initialAutoPosts={initialAutoPosts}
    />
  );
}
