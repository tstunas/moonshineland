"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAndRedirectAction } from "@/features/auth/actions";
import { cn } from "@/lib/cn";
import { BOARDS } from "@/lib/constants";
import {
  getHeaderPresenceSnapshot,
  subscribeHeaderPresence,
} from "@/components/layout/headerPresenceStore";

export interface HeaderNavItem {
  href: string;
  label: string;
  isActive?: boolean;
}

export interface HeaderAction {
  href: string;
  label: string;
  variant?: "primary" | "ghost";
}

interface HeaderProps {
  brandName?: string;
  brandHref?: string;
  actions?: HeaderAction[];
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  className?: string;
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
}

const DEFAULT_ACTIONS: HeaderAction[] = [
  { href: "/login", label: "로그인", variant: "ghost" },
  { href: "/signup", label: "회원가입", variant: "primary" },
];

function subscribeDocumentTitle(onStoreChange: () => void) {
  if (typeof document === "undefined") {
    return () => {};
  }

  const titleElement = document.querySelector("title");

  if (!titleElement) {
    const intervalId = window.setInterval(onStoreChange, 250);
    return () => {
      window.clearInterval(intervalId);
    };
  }

  const observer = new MutationObserver(() => {
    onStoreChange();
  });

  observer.observe(titleElement, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  return () => {
    observer.disconnect();
  };
}

function getDocumentTitleSnapshot() {
  if (typeof document === "undefined") {
    return "";
  }

  return document.title.trim();
}

export function Header({
  brandName = "MoonshineLand",
  brandHref = "/",
  actions = DEFAULT_ACTIONS,
  isAuthenticated = false,
  isAdmin = false,
  className,
  onMenuToggle,
  isSidebarOpen = true,
}: HeaderProps) {
  const pathname = usePathname();
  const documentTitle = useSyncExternalStore(
    subscribeDocumentTitle,
    getDocumentTitleSnapshot,
    () => "",
  );
  const headerPresence = useSyncExternalStore(
    subscribeHeaderPresence,
    getHeaderPresenceSnapshot,
    () => ({ scope: null, count: null }),
  );
  const marqueeViewportRef = useRef<HTMLSpanElement | null>(null);
  const marqueeTextRef = useRef<HTMLSpanElement | null>(null);
  const [marqueeDistance, setMarqueeDistance] = useState(0);

  useEffect(() => {
    const viewport = marqueeViewportRef.current;
    const text = marqueeTextRef.current;

    if (!viewport || !text) {
      return;
    }

    const measureOverflow = () => {
      const overflowDistance = Math.max(0, text.scrollWidth - viewport.clientWidth);
      setMarqueeDistance(overflowDistance);
    };

    measureOverflow();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureOverflow);
      return () => {
        window.removeEventListener("resize", measureOverflow);
      };
    }

    const observer = new ResizeObserver(() => {
      measureOverflow();
    });

    observer.observe(viewport);
    observer.observe(text);

    return () => {
      observer.disconnect();
    };
  }, [pathname, documentTitle]);

  const routeBrand = useMemo(() => {
    const boardMatch = pathname.match(/^\/board\/([^/]+)(?:\/|$)/);
    if (!boardMatch) {
      return {
        name: brandName,
        href: brandHref,
        showBackToBoard: false,
        backHref: null as string | null,
      };
    }

    const boardKey = decodeURIComponent(boardMatch[1]);
    const board = BOARDS.find((item) => item.key === boardKey);
    const boardLabel = board?.label ?? boardKey;
    const boardHrefResolved = `/board/${encodeURIComponent(boardKey)}`;

    const threadMatch = pathname.match(/^\/board\/([^/]+)\/(\d+)(?:\/|$)/);
    if (!threadMatch) {
      return {
        name: boardLabel,
        href: boardHrefResolved,
        showBackToBoard: false,
        backHref: null as string | null,
      };
    }

    const threadIndex = threadMatch[2];
    const threadHref = `${boardHrefResolved}/${threadIndex}`;
    const normalizedTitle = documentTitle
      .replace(/\s*-\s*자동투하 관리\s*$/u, "")
      .trim();
    const threadTitle =
      normalizedTitle && normalizedTitle !== "문샤인랜드"
        ? normalizedTitle
        : boardLabel;

    return {
      name: threadTitle,
      href: threadHref,
      showBackToBoard: true,
      backHref: boardHrefResolved,
    };
  }, [pathname, documentTitle, brandName, brandHref]);

  const isMarqueeActive = marqueeDistance > 0;
  const marqueeDurationSeconds = Math.max(8, marqueeDistance / 24 + 4);
  const shouldShowLiveMemberCount = /^\/board\/[^/]+(?:\/|$)/.test(pathname);
  const liveMemberCount = headerPresence.count ?? 0;
  const marqueeStyle = {
    "--header-brand-marquee-distance": `${marqueeDistance}px`,
    "--header-brand-marquee-duration": `${marqueeDurationSeconds.toFixed(2)}s`,
  } as CSSProperties;

  return (
    <header
      data-is-admin={isAdmin ? "true" : "false"}
      className={cn(
        "sticky top-0 z-50 border-b border-sky-700 bg-sky-600 text-white",
        className,
      )}
    >
      <div className="flex h-12 w-full items-center justify-between px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sky-100 transition-colors hover:bg-sky-700/70 hover:text-white"
            aria-label={isSidebarOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={isSidebarOpen}
            onClick={onMenuToggle}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </svg>
          </button>

          {routeBrand.showBackToBoard && routeBrand.backHref ? (
            <Link
              href={routeBrand.backHref}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sky-100 transition-colors hover:bg-sky-700/70 hover:text-white"
              aria-label="게시판으로 돌아가기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          ) : null}

          <Link
            href={routeBrand.href}
            className="block max-w-[min(58vw,34rem)] min-w-0 text-base font-semibold tracking-tight text-white sm:max-w-[min(52vw,42rem)] sm:text-lg"
            title={routeBrand.name}
          >
            <span className="header-brand-marquee" ref={marqueeViewportRef}>
              <span
                className={cn(
                  "header-brand-marquee__text",
                  isMarqueeActive && "header-brand-marquee__text--animated",
                )}
                ref={marqueeTextRef}
                style={isMarqueeActive ? marqueeStyle : undefined}
              >
                {routeBrand.name}
              </span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {shouldShowLiveMemberCount ? (
            <div
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200/60 bg-sky-900/35 px-2.5 py-1 text-[11px] font-semibold text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] sm:gap-2 sm:px-3 sm:text-xs"
              aria-label={`실시간 접속회원 ${liveMemberCount}명`}
              title={`실시간 접속회원 ${liveMemberCount}명`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_0_2px_rgba(16,185,129,0.25)]"
                aria-hidden="true"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3.5 w-3.5 text-sky-100/95"
                aria-hidden="true"
              >
                <path d="M20 21a8 8 0 1 0-16 0" />
                <circle cx="12" cy="7" r="3" />
              </svg>
              <span className="min-w-[1.5ch] text-right tabular-nums">
                {liveMemberCount}
              </span>
            </div>
          ) : null}

          {isAuthenticated ? (
            <form action={logoutAndRedirectAction}>
              <button
                type="submit"
                className="rounded-md border border-sky-200/70 px-3 py-1.5 text-xs font-semibold text-sky-50 transition-colors hover:bg-sky-700/70 hover:text-white sm:text-sm"
              >
                로그아웃
              </button>
            </form>
          ) : (
            actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                  action.variant === "primary"
                    ? "border-sky-100 bg-sky-700 text-white hover:bg-sky-800"
                    : "border-sky-200/70 text-sky-50 hover:bg-sky-700/70 hover:text-white",
                )}
              >
                {action.label}
              </Link>
            ))
          )}
        </div>
      </div>
    </header>
  );
}
