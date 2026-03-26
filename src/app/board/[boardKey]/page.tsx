import { BOARDS } from "@/lib/constants";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardKey: string }>;
}) {
  const { boardKey } = await params;

  if (BOARDS.find((board) => board.key === boardKey) === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <h1 className="text-2xl font-bold text-slate-900">
          존재하지 않는 게시판입니다.
        </h1>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <h1 className="text-2xl font-bold text-slate-900">
        {BOARDS.find((board) => board.key === boardKey)?.label}
      </h1>
    </div>
  );
}
