"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

interface ScrollQuickButtonsProps {
  containerRef: RefObject<HTMLElement | null>;
  topThreshold?: number;
  bottomThreshold?: number;
}

export function ScrollQuickButtons({
  containerRef,
  topThreshold = 260,
  bottomThreshold = 140,
}: ScrollQuickButtonsProps) {
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const [showScrollBottomButton, setShowScrollBottomButton] = useState(false);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    scrollContainerRef.current = containerRef.current?.closest("main") ?? null;

    const updateButtonVisibility = () => {
      const scroller = scrollContainerRef.current;
      const topOffset = scroller ? scroller.scrollTop : window.scrollY;
      const remaining = scroller
        ? scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight)
        : document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);

      setShowScrollTopButton(topOffset > topThreshold);
      setShowScrollBottomButton(remaining > bottomThreshold);
    };

    const scroller = scrollContainerRef.current;

    updateButtonVisibility();
    if (scroller) {
      scroller.addEventListener("scroll", updateButtonVisibility, { passive: true });
    } else {
      window.addEventListener("scroll", updateButtonVisibility, { passive: true });
    }
    window.addEventListener("resize", updateButtonVisibility);

    return () => {
      if (scroller) {
        scroller.removeEventListener("scroll", updateButtonVisibility);
      } else {
        window.removeEventListener("scroll", updateButtonVisibility);
      }
      window.removeEventListener("resize", updateButtonVisibility);
    };
  }, [bottomThreshold, containerRef, topThreshold]);

  const scrollToTop = () => {
    const scroller = scrollContainerRef.current;
    if (scroller) {
      scroller.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const scrollToBottom = () => {
    const scroller = scrollContainerRef.current;
    if (scroller) {
      scroller.scrollTo({
        top: scroller.scrollHeight,
        behavior: "smooth",
      });
      return;
    }

    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  if (!showScrollTopButton && !showScrollBottomButton) {
    return null;
  }

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-40 flex flex-col gap-2 rounded-full border border-sky-200/70 bg-white/85 p-1.5 shadow-lg shadow-sky-900/15 backdrop-blur-md">
      {showScrollTopButton ? (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="페이지 상단으로 이동"
          title="페이지 상단으로 이동"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/80 bg-white text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
        >
          <span aria-hidden="true">↑</span>
        </button>
      ) : null}

      {showScrollBottomButton ? (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="페이지 하단으로 이동"
          title="페이지 하단으로 이동"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-300/80 bg-sky-500 text-white transition hover:bg-sky-600"
        >
          <span aria-hidden="true">↓</span>
        </button>
      ) : null}
    </div>
  );
}