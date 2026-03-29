"use client";

import Link from "next/link";

import { logoutAndRedirectAction } from "@/features/auth/actions";
import { cn } from "@/lib/cn";

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
  className?: string;
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
}

const DEFAULT_ACTIONS: HeaderAction[] = [
  { href: "/login", label: "로그인", variant: "ghost" },
  { href: "/signup", label: "회원가입", variant: "primary" },
];

export function Header({
  brandName = "MoonshineLand",
  brandHref = "/",
  actions = DEFAULT_ACTIONS,
  isAuthenticated = false,
  className,
  onMenuToggle,
  isSidebarOpen = true,
}: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-sky-700 bg-sky-600 text-white",
        className,
      )}
    >
      <div className="flex h-12 w-full items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-3">
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

          <Link
            href={brandHref}
            className="text-base font-semibold tracking-tight text-white sm:text-lg"
          >
            {brandName}
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
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
