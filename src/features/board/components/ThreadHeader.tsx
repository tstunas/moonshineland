import { AnonymousAuthor } from "@/lib/constants";
import { cn } from "@/lib/cn";
import type { Thread } from "@/types/thread";

function formatThreadDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "Asia/Seoul" }).format(date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} (${weekday}) ${hours}:${minutes}:${seconds}`;
}

export function ThreadHeader({ thread }: { thread: Thread }) {
  const author = thread.author || AnonymousAuthor;
  const threadBadges = [
    {
      key: thread.isChat ? "chat" : "serial",
      label: thread.isChat ? "잡담판" : "연재판",
      className: thread.isChat
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-sky-200 bg-sky-50 text-sky-700",
    },
    ...(thread.isAdultOnly
      ? [
          {
            key: "adult",
            label: "성인만",
            className: "border-rose-200 bg-rose-50 text-rose-700",
          },
        ]
      : []),
  ];

  return (
    <header className="border border-sky-200 bg-slate-200 px-4 py-4 shadow-[0_16px_35px_-28px_rgba(15,23,42,0.55)]">
      <div className="flex flex-wrap items-center gap-2">
        {threadBadges.map((badge) => (
          <span
            key={badge.key}
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium tracking-[0.12em]",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        ))}
      </div>

      <h1 className="mt-3 text-[15px] font-semibold leading-snug text-sky-900 sm:text-[20px] md:text-[24px]">
        [{thread.threadIndex}] {thread.title} ({thread.postCount})
      </h1>

      <p className="mt-2 text-[15px] leading-tight text-sky-800">
        {author}
        {thread.idcode ? (
          <span className="ml-1 text-[13px] text-slate-500">
            ({thread.idcode})
          </span>
        ) : null}
      </p>

      <p className="mt-1 text-[13px] leading-tight text-slate-500">
        생성일: {formatThreadDate(thread.createdAt)}
      </p>
      <p className="mt-1 text-[13px] leading-tight text-slate-500">
        갱신일: {formatThreadDate(thread.postUpdatedAt)}
      </p>
    </header>
  );
}
