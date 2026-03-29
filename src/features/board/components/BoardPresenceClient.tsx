"use client";

import { useBoardSse } from "@/hooks/useBoardSse";

interface BoardPresenceClientProps {
  boardKey: string;
}

export function BoardPresenceClient({ boardKey }: BoardPresenceClientProps) {
  const { userCount } = useBoardSse(boardKey);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1.5 text-sm text-slate-700 shadow-sm backdrop-blur-sm">
      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
      <span>실시간 접속자</span>
      <strong className="font-semibold text-sky-900">{userCount ?? 0}</strong>
    </div>
  );
}