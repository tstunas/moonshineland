import Link from "next/link";
import type { Thread } from "@/types/thread";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { AnonymousAuthor } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface ThreadItemProps {
  boardKey: string;
  thread: Thread;
}

export function ThreadItem({ thread, boardKey }: ThreadItemProps) {
  const postCountText = `(${formatNumber(thread.postCount)})`;
  const authorLabel = thread.author || AnonymousAuthor;
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

  const relativeUpdate = `${formatRelativeTime(thread.postUpdatedAt)} 갱신`;
  const threadRecentHref = `/board/${boardKey}/${thread.threadIndex}/recent`;
  const threadHref = `/board/${boardKey}/${thread.threadIndex}`;

  return (
    <article className="group rounded-[6px] border border-sky-200 bg-slate-200 px-4 py-4 shadow-[0_16px_35px_-28px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_22px_45px_-30px_rgba(14,116,144,0.45)]">
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

      <h3 className="mt-3 text-[15px] font-normal leading-snug text-sky-900 transition-colors group-hover:text-sky-700 sm:text-[18px] md:text-[20px]">
        <Link href={threadRecentHref}>{thread.title}</Link>{" "}
        <Link href={threadHref}>{postCountText}</Link>
      </h3>
      <p className="mt-2 truncate text-[15px] leading-tight text-sky-800">
        {authorLabel}
      </p>

      <p className="mt-1 text-[13px] leading-tight text-slate-500">
        {relativeUpdate}
      </p>
    </article>
  );
}
