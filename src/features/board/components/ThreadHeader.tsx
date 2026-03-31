import { AnonymousAuthor } from "@/lib/constants";
import type { Thread } from "@/types/thread";

function formatThreadDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "Asia/Seoul" }).format(
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

  return (
    <header className="rounded-[24px] border border-sky-200 bg-[linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.94))] px-5 py-5 shadow-[0_16px_35px_-30px_rgba(15,23,42,0.45)]">
      <h1 className="truncate text-[26px] font-semibold leading-tight text-slate-900">
        #{thread.threadIndex} {thread.title} ({thread.postCount})
      </h1>

      <div className="mt-5 space-y-1.5 text-[15px] leading-tight text-slate-800">
        <p>
          <span className="mr-2 text-[14px] font-medium text-sky-900">작성자:</span>
          <span>{author}</span>
          {thread.idcode ? (
            <span className="ml-1 text-[13px] text-slate-500">
              ({thread.idcode})
            </span>
          ) : null}
        </p>
        <p>
          <span className="mr-2 text-[14px] font-medium text-sky-900">작성일:</span>
          {formatThreadDate(thread.createdAt)}
        </p>
        <p>
          <span className="mr-2 text-[14px] font-medium text-sky-900">갱신일:</span>
          {formatThreadDate(thread.postUpdatedAt)}
        </p>
      </div>
    </header>
  );
}
