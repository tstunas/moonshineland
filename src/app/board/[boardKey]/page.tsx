import { ThreadForm } from "@/features/board/components/ThreadForm";
import { ThreadItem } from "@/features/board/components/ThreadItem";
import { ThreadPagination } from "@/features/board/components/ThreadPagination";
import { getThreads } from "@/features/board/lib/getThreads";
import { getTotalThreads } from "@/features/board/lib/getTotalThreads";
import { BOARDS } from "@/lib/constants";

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardKey: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { boardKey } = await params;
  const { page } = await searchParams;

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

  const threadItems = await getThreads(boardKey);
  const totalThreads = await getTotalThreads(boardKey);
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const totalPages = Math.ceil(totalThreads / 20);

  return (
    <>
      <div className="flex h-full items-center justify-center">
        <h1 className="text-2xl font-bold text-slate-900">{board.label}</h1>
      </div>
      <ul className="mt-4 space-y-2">
        {threadItems.map((thread) => (
          <li key={thread.id} className="p-2 border rounded">
            <ThreadItem thread={thread} boardKey={boardKey} />
          </li>
        ))}
      </ul>
      <div className="flex justify-center py-6">
        <ThreadPagination
          totalPages={totalPages}
          currentPage={currentPage}
          basePath={`/board/${boardKey}`}
        />
      </div>
      <ThreadForm boardKey={boardKey} />
    </>
  );
}
