"use client";

import { startTransition, useState } from "react";

import { useThreadSse } from "@/hooks/useThreadSse";
import type { Post } from "@/types/post";
import type { Thread } from "@/types/thread";

import { PostForm } from "./PostForm";
import { PostItem } from "./PostItem";
import { ThreadHeader } from "./ThreadHeader";
import { ThreadNavigation } from "./ThreadNavigation";

interface ThreadLiveClientProps {
  boardKey: string;
  initialPosts: Post[];
  initialThread: Thread;
  mode?: "recent" | "range" | "all";
  rangeStart?: number;
  rangeEnd?: number;
}

export function ThreadLiveClient({
  initialThread,
  initialPosts,
  boardKey,
  mode = "recent",
  rangeStart,
  rangeEnd,
}: ThreadLiveClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [thread, setThread] = useState(initialThread);
  const [receiveNewPosts, setReceiveNewPostsState] = useState(['recent', 'all'].includes(mode));

  const { userCount, setReceiveNewPosts } = useThreadSse(
    boardKey,
    initialThread.threadIndex,
    {
      initialReceiveNewPosts: ['recent', 'all'].includes(mode),
      onNewPost: (post) => {
        startTransition(() => {
          setPosts((currentPosts) => {
            if (
              currentPosts.some((currentPost) => currentPost.id === post.id)
            ) {
              return currentPosts;
            }
            return [...currentPosts, post].sort(
              (a, b) => a.postOrder - b.postOrder,
            );
          });
          setThread((currentThread) => ({
            ...currentThread,
            postCount: Math.max(currentThread.postCount, post.postOrder),
            postUpdatedAt: new Date(Math.max(new Date(currentThread.postUpdatedAt).getTime(), new Date(post.createdAt).getTime())),
          }));
        });
      },
      onPostContentEdited: (data) => {
        startTransition(() => {
          setPosts((currentPosts) =>
            currentPosts.map((post) =>
              post.id === data.postId
                ? {
                    ...post,
                    content: data.content,
                    rawContent: data.rawContent,
                    isEdited: data.isEdited,
                    contentUpdatedAt: new Date(data.contentUpdatedAt),
                    updatedAt: new Date(data.updatedAt),
                  }
                : post,
            ),
          );
        });
      },
      onPostContentTypeEdited: (data) => {
        startTransition(() => {
          setPosts((currentPosts) =>
            currentPosts.map((post) =>
              post.id === data.postId
                ? {
                    ...post,
                    contentType: data.contentType,
                    updatedAt: new Date(data.updatedAt),
                  }
                : post,
            ),
          );
        });
      },
    },
  );

  const liveThread: Thread = {
    ...thread,
    postCount: posts.length,
  };

  return (
    <div className="relative">
      <div className="mb-4">
        <ThreadNavigation
          boardKey={boardKey}
          threadIndex={liveThread.threadIndex}
          postCount={liveThread.postCount}
          mode={mode}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-sky-200/80 bg-white/78 p-4 shadow-[0_14px_30px_-22px_rgba(14,116,144,0.7)] backdrop-blur-md md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <span
            className="h-2 w-2 rounded-full bg-emerald-500"
            aria-hidden="true"
          />
          <span>실시간 접속자</span>
          <strong className="font-semibold text-sky-900">
            {userCount ?? 0}
          </strong>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={receiveNewPosts}
            onChange={(event) => {
              const nextValue = event.target.checked;
              setReceiveNewPostsState(nextValue);
              void setReceiveNewPosts(nextValue);
            }}
            className="h-4 w-4 rounded border-sky-300 text-sky-600 focus:ring-sky-500"
          />
          새 답글 자동 수신
        </label>
      </div>

      <ThreadHeader thread={liveThread} />

      <ul className="mt-6 space-y-4">
        {posts.map((post) => (
          <li key={post.id}>
            <PostItem post={post} />
          </li>
        ))}
      </ul>
      <div className="flex justify-center py-4" />
      <PostForm boardKey={boardKey} threadIndex={liveThread.threadIndex} />
    </div>
  );
}
