"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

export interface SidebarItem {
  label: string;
  href: string;
  description?: string;
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
  requiresAdmin?: boolean;
}

interface SidebarProps {
  sections?: SidebarSection[];
  className?: string;
  title?: string;
  isAdmin?: boolean;
  onItemClick?: () => void;
}

const DEFAULT_SECTIONS: SidebarSection[] = [
  {
    title: "도움말",
    items: [{ label: "가이드", href: "/guide" }],
  },
  {
    title: "게시판",
    items: [
      { label: "앵커판", href: "/board/anchor" },
      { label: "OR판", href: "/board/orpg" },
      { label: "테스트판", href: "/board/test" },
      { label: "번역판", href: "/board/trans" },
      { label: "명예의 전당", href: "/board/honor" },
      { label: "게시판 목록", href: "/boards" },
    ],
  },
  {
    title: "보관",
    items: [
      { label: "아카이브", href: "/archive" },
    ],
  },
  {
    title: "환경설정",
    items: [{ label: "개인선호설정", href: "/preferences" }],
  },
  {
    title: "관리자 페이지",
    requiresAdmin: true,
    items: [
      { label: "대시보드", href: "/dashboard" },
      { label: "감사 로그", href: "/audits" },
    ],
  },
];

export function Sidebar({
  sections = DEFAULT_SECTIONS,
  className,
  title = "네비게이션",
  isAdmin = false,
  onItemClick,
}: SidebarProps) {
  const pathname = usePathname();
  const visibleSections = sections.filter((section) => !section.requiresAdmin || isAdmin);

  const isItemActive = (item: SidebarItem) => {
    if (item.href === "/") {
      return pathname === item.href;
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <aside
      className={cn(
        "h-full w-36 shrink-0 self-stretch border-r border-slate-300 bg-slate-200",
        className,
      )}
      aria-label={title}
    >
      <div className="h-full overflow-y-auto px-3 py-5">
        <p className="mb-5 flex items-center gap-2 border-b border-slate-300 pb-3 text-sm font-semibold text-slate-600">
          <span
            className="inline-block h-3 w-3 rounded-sm bg-slate-500"
            aria-hidden="true"
          />
          <span>{title}</span>
        </p>

        <div className="space-y-5">
          {visibleSections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {section.title}
              </h2>

              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={`${section.title}-${item.href}`}>
                    <Link
                      href={item.href}
                      onClick={onItemClick}
                      aria-current={isItemActive(item) ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-2 py-1.5 text-sm transition-colors",
                        isItemActive(item)
                          ? "bg-sky-100/85 font-semibold text-sky-900 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.95)]"
                          : "text-slate-700 hover:bg-slate-300/80 hover:text-slate-900",
                      )}
                    >
                      <span>{item.label}</span>
                      {item.description ? (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px]",
                            isItemActive(item)
                              ? "bg-sky-200 text-sky-900"
                              : "bg-slate-300 text-slate-700",
                          )}
                        >
                          {item.description}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </aside>
  );
}
