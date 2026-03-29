"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";

import { getPostsAfterAction } from "@/features/board/actions/post/getPostsAfterAction";
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
  canManageThread?: boolean;
}

export function ThreadLiveClient({
  initialThread,
  initialPosts,
  boardKey,
  mode = "recent",
  rangeStart,
  rangeEnd,
  canManageThread = false,
}: ThreadLiveClientProps) {
  const initialReceiveNewPosts = mode !== "range";
  const [posts, setPosts] = useState(initialPosts);
  const [thread, setThread] = useState(initialThread);
  const [receiveNewPosts, setReceiveNewPostsState] = useState(
    initialReceiveNewPosts,
  );
  const [isReplyAlertEnabled, setIsReplyAlertEnabled] = useState(true);
  const [isBottomLockEnabled, setIsBottomLockEnabled] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showScrollBottomButton, setShowScrollBottomButton] = useState(false);
  const postsRef = useRef(posts);
  const pendingScrollBottomAfterRenderRef = useRef(false);
  const postFormContainerRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const bottomLockStorageKey = `moonshineland:thread-bottom-lock:${boardKey}:${initialThread.threadIndex}`;

  const isFormVisibleInViewport = useCallback(() => {
    const formElement = postFormContainerRef.current;
    if (!formElement) {
      return false;
    }

    const rect = formElement.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }, []);

  const playReplyAlarm = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      const context =
        audioContextRef.current ??
        new AudioContextClass();
      audioContextRef.current = context;

      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.22);
    } catch {
      // 일부 브라우저 정책으로 소리가 차단될 수 있음
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  const queueScrollBottomAfterRender = useCallback(() => {
    pendingScrollBottomAfterRenderRef.current = true;
  }, []);

  const handleToggleReplyAlert = useCallback((enabled: boolean) => {
    setIsReplyAlertEnabled(enabled);
  }, []);

  const refreshMissingPosts = useCallback(
    async (preserveFormViewport: boolean) => {
      const shouldPreserve = preserveFormViewport && isFormVisibleInViewport();
      const beforeTop = shouldPreserve
        ? postFormContainerRef.current?.getBoundingClientRect().top ?? null
        : null;

      const lastPostOrder = postsRef.current.reduce(
        (max, post) => Math.max(max, post.postOrder),
        -1,
      );

      const nextPosts = await getPostsAfterAction(
        boardKey,
        initialThread.threadIndex,
        lastPostOrder,
      );

      if (nextPosts.length === 0) {
        return;
      }

      startTransition(() => {
        setPosts((currentPosts) => {
          const map = new Map(currentPosts.map((post) => [post.id, post]));
          for (const post of nextPosts) {
            map.set(post.id, post);
          }
          return Array.from(map.values()).sort((a, b) => a.postOrder - b.postOrder);
        });

        setThread((currentThread) => {
          const maxIncomingOrder = nextPosts.reduce(
            (max, post) => Math.max(max, post.postOrder),
            currentThread.postCount,
          );
          const latestIncomingTime = nextPosts.reduce(
            (max, post) => Math.max(max, new Date(post.createdAt).getTime()),
            new Date(currentThread.postUpdatedAt).getTime(),
          );

          return {
            ...currentThread,
            postCount: maxIncomingOrder,
            postUpdatedAt: new Date(latestIncomingTime),
          };
        });
      });

      if (beforeTop !== null) {
        window.requestAnimationFrame(() => {
          const afterTop =
            postFormContainerRef.current?.getBoundingClientRect().top ?? null;
          if (afterTop === null) {
            return;
          }
          const delta = afterTop - beforeTop;
          if (delta !== 0) {
            window.scrollBy({ top: delta, behavior: "auto" });
          }
        });
      }
    },
    [boardKey, initialThread.threadIndex, isFormVisibleInViewport],
  );

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    if (!pendingScrollBottomAfterRenderRef.current) {
      return;
    }

    pendingScrollBottomAfterRenderRef.current = false;

    // 상태 반영 후 실제 DOM 높이가 확정된 다음 프레임에서 하단으로 이동
    window.requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [posts, thread.postCount, scrollToBottom]);

  useEffect(() => {
    const updateButtonVisibility = () => {
      const doc = document.documentElement;
      const remaining = doc.scrollHeight - (window.scrollY + window.innerHeight);
      setShowScrollBottomButton(remaining > 140);
    };

    updateButtonVisibility();
    window.addEventListener("scroll", updateButtonVisibility, { passive: true });
    window.addEventListener("resize", updateButtonVisibility);

    return () => {
      window.removeEventListener("scroll", updateButtonVisibility);
      window.removeEventListener("resize", updateButtonVisibility);
    };
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(bottomLockStorageKey);
    setIsBottomLockEnabled(stored === "1");
  }, [bottomLockStorageKey]);

  const { userCount, setReceiveNewPosts, connectionStatus } = useThreadSse(
    boardKey,
    initialThread.threadIndex,
    {
      initialReceiveNewPosts,
      onNewPost: (post) => {
        const shouldPlayAlarm =
          isReplyAlertEnabled &&
          (document.visibilityState !== "visible" || !document.hasFocus());

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

        if (shouldPlayAlarm) {
          playReplyAlarm();
        }

        if (isBottomLockEnabled) {
          queueScrollBottomAfterRender();
        }
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
      onPostVisibilityEdited: (data) => {
        startTransition(() => {
          setPosts((currentPosts) =>
            currentPosts.map((post) =>
              post.id === data.postId
                ? {
                    ...post,
                    isHidden: data.isHidden,
                    updatedAt: new Date(data.updatedAt),
                  }
                : post,
            ),
          );
        });
      },
    },
  );

  const liveThread: Thread = thread;
  const visiblePosts =
    canManageThread && isAdminMode
      ? posts
      : posts.filter((post) => !post.isHidden);

  const connectionStatusLabel =
    connectionStatus === "connected"
      ? "연결됨"
      : connectionStatus === "reconnecting"
        ? "재연결 중"
        : connectionStatus === "connecting"
          ? "연결 중"
          : "끊김";

  const connectionStatusClassName =
    connectionStatus === "connected"
      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
      : connectionStatus === "reconnecting"
        ? "border-amber-300 bg-amber-100 text-amber-800"
        : connectionStatus === "connecting"
          ? "border-sky-300 bg-sky-100 text-sky-800"
          : "border-rose-300 bg-rose-100 text-rose-800";

  useEffect(() => {
    if (mode === "range") {
      return;
    }

    let cancelled = false;

    const syncMissingPosts = async () => {
      await refreshMissingPosts(false);
      if (cancelled) {
        return;
      }
    };

    void syncMissingPosts();

    return () => {
      cancelled = true;
    };
  }, [boardKey, initialThread.threadIndex, mode, refreshMissingPosts]);

  useEffect(() => {
    if (!receiveNewPosts) {
      return;
    }

    let inFlight = false;
    let cancelled = false;

    const syncOnReturn = async () => {
      if (cancelled || inFlight) {
        return;
      }

      inFlight = true;
      try {
        await refreshMissingPosts(false);
        if (cancelled) {
          return;
        }
      } finally {
        inFlight = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncOnReturn();
      }
    };

    const handleWindowFocus = () => {
      void syncOnReturn();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [boardKey, initialThread.threadIndex, receiveNewPosts, refreshMissingPosts]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

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
          <span
            className={`ml-2 rounded border px-2 py-0.5 text-xs font-semibold ${connectionStatusClassName}`}
          >
            SSE {connectionStatusLabel}
          </span>
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
          새 레스 자동 수신
        </label>
      </div>

      <ThreadHeader thread={thread} />

      <ul className="mt-6 space-y-4">
        {visiblePosts.map((post) => (
          <li key={post.id}>
            <PostItem
              post={post}
              boardKey={boardKey}
              threadIndex={liveThread.threadIndex}
              canManageThread={canManageThread}
              isAdminMode={isAdminMode}
            />
          </li>
        ))}
      </ul>
      <div className="flex justify-center py-4" />
      <div ref={postFormContainerRef}>
        <PostForm
          boardKey={boardKey}
          threadIndex={liveThread.threadIndex}
          posts={posts}
          thread={thread}
          mode={mode}
          canManageThread={canManageThread}
          isReplyAlertEnabled={isReplyAlertEnabled}
          isBottomLockEnabled={isBottomLockEnabled}
          onToggleReplyAlert={handleToggleReplyAlert}
          onToggleBottomLock={(enabled) => {
            setIsBottomLockEnabled(enabled);
            window.localStorage.setItem(bottomLockStorageKey, enabled ? "1" : "0");
            if (enabled) {
              queueScrollBottomAfterRender();
            }
          }}
          onRequestRefresh={async () => {
            if (isBottomLockEnabled) {
              queueScrollBottomAfterRender();
              await refreshMissingPosts(false);
              return;
            }
            await refreshMissingPosts(true);
          }}
          onPostCreated={() => {
            queueScrollBottomAfterRender();
          }}
          onAdminModeChange={setIsAdminMode}
          onThreadChanged={(nextThread) => {
            setThread((currentThread) => ({
              ...currentThread,
              ...nextThread,
            }));
          }}
        />
      </div>

      {showScrollBottomButton ? (
        <button
          type="button"
          onClick={scrollToBottom}
          title="페이지 하단으로 이동"
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-900/20 transition hover:bg-sky-600"
        >
          <span aria-hidden="true">↓</span>
          하단 고정
        </button>
      ) : null}
    </div>
  );
}
