import { cn } from "@/lib/cn";
import { AnonymousAuthor } from "@/lib/constants";
import { Post } from "@/types/post";

export function PostItem({ post }: { post: Post }) {
  const author = post.author || AnonymousAuthor;
  const contentTypeLabel = post.contentType !== "text" ? "</>" : null;

  const formatPostDate = (value: Date | string) => {
    const date = value instanceof Date ? value : new Date(value);
    const weekday = new Intl.DateTimeFormat("ko-KR", {
      weekday: "short",
    }).format(date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} (${weekday}) ${hours}:${minutes}:${seconds}`;
  };

  return (
    <article className="overflow-hidden rounded-lg border border-sky-200 bg-white">
      <header className="border-b border-sky-200 bg-slate-200 px-6 py-4">
        <p className="text-[20px] leading-tight text-sky-900">
          <span className="font-semibold">#{post.postOrder}</span>{" "}
          <span>{author}</span>{" "}
          <span className="text-[16px] leading-tight text-slate-700">
            ({post.idcode})
          </span>{" "}
          {contentTypeLabel ? (
            <span className="rounded border border-sky-300 px-1.5 py-0.5 text-[20px] leading-none text-sky-700">
              {contentTypeLabel}
            </span>
          ) : null}
        </p>
        <p className="mt-2 text-[16px] leading-tight text-slate-700">
          {formatPostDate(post.createdAt)}
        </p>
      </header>

      <div className="px-6 py-6">
        <div
          className={cn(
            "content whitespace-pre-wrap break-words text-[16px] leading-relaxed text-slate-900",
            post.contentType,
          )}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>
    </article>
  );
}
