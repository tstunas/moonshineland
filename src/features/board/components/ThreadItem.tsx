import Link from "next/link";
import type { Thread } from "@/types/thread";
import { formatNumber } from "@/lib/format";

interface ThreadItemProps {
  boardKey: string;
  thread: Thread;
}

export function ThreadItem({ thread, boardKey }: ThreadItemProps) {
  const threadNo = `#${thread.threadIndex}`;
  const postCountText = `(${formatNumber(thread.postCount)})`;
  const authorLabel = thread.author;

  const formatThreadDate = (value: Date | string) => {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  };

  const dateRange = `${formatThreadDate(thread.createdAt)} - ${formatThreadDate(thread.updatedAt)}`;
  const threadRecentHref = `/board/${boardKey}/${thread.threadIndex}/recent`;
  const threadHref = `/board/${boardKey}/${thread.threadIndex}`;

  return (
    <article className="group rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 transition-colors hover:bg-slate-50">
      <h3 className="truncate text-[22px] font-normal leading-tight text-sky-900 transition-colors group-hover:text-sky-700">
        {threadNo} <Link href={threadRecentHref}>{thread.title}</Link>{" "}
        <Link href={threadHref}>{postCountText}</Link>
      </h3>
      <p className="mt-2 truncate text-[17px] leading-tight text-sky-800">
        {authorLabel}
      </p>

      <p className="mt-1 text-[18px] leading-tight text-slate-700">
        {dateRange}
      </p>
    </article>
  );
}
