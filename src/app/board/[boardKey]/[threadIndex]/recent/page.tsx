import { PostForm } from "@/features/board/components/PostForm";
import { PostItem } from "@/features/board/components/PostItem";
import { ThreadHeader } from "@/features/board/components/ThreadHeader";
import { ThreadNavigation } from "@/features/board/components/ThreadNavigation";
import { getPosts } from "@/features/board/lib/getPosts";
import { getThread } from "@/features/board/lib/getThread";

export default async function ThreadRecentPage({
  params,
}: {
  params: Promise<{ boardKey: string; threadIndex: number }>;
}) {
  const { boardKey, threadIndex: _threadIndex } = await params;
  const threadIndex = Number(_threadIndex);

  const thread = await getThread(boardKey, threadIndex);

  if (!thread) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-gradient-to-b from-sky-50 via-white to-cyan-50 p-12 shadow-lg">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-200">
            <span className="text-5xl">🔍</span>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900">
              존재하지 않는 스레드입니다
            </h1>
            <p className="mt-2 text-slate-600">
              찾고 있는 스레드를 찾을 수 없습니다. 다시 확인해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const posts = await getPosts(boardKey, threadIndex);

  return (
    <div className="relative">
      <div className="mb-4">
        <ThreadNavigation
          boardKey={boardKey}
          threadIndex={threadIndex}
          postCount={thread.postCount}
          mode="recent"
        />
      </div>

      <ThreadHeader thread={thread} />

      <ul className="mt-6 space-y-4">
        {posts.map((post) => (
          <li key={post.id}>
            <PostItem post={post} />
          </li>
        ))}
      </ul>
      <div className="flex justify-center py-4" />
      <PostForm boardKey={boardKey} threadIndex={threadIndex} />
    </div>
  );
}
