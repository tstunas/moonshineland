import { AnonymousAuthor } from "@/lib/constants";
import type { Thread } from "@/types/thread";

function formatThreadDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(
    date,
  );
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
  const authorText = thread.idcode
    ? `${author} (${thread.idcode})`
    : author;

  return (
    <header className="rounded-lg border border-sky-200 bg-slate-100 px-6 py-6">
      <h1 className="truncate text-[30px] font-bold leading-tight text-slate-900">
        #{thread.threadIndex} {thread.title} ({thread.postCount})
      </h1>

      <div className="mt-6 space-y-2 text-[18px] leading-tight text-slate-900">
        <p>
          <span className="mr-3 text-sky-900">작성자:</span>
          {authorText}
        </p>
        <p>
          <span className="mr-3 text-sky-900">작성일:</span>
          {formatThreadDate(thread.createdAt)}
        </p>
        <p>
          <span className="mr-3 text-sky-900">갱신일:</span>
          {formatThreadDate(thread.updatedAt)}
        </p>
      </div>
    </header>
  );
}
