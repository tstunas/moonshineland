"use client";

import { useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/cn";

interface AppShellProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export function AppShell({ children, isAuthenticated, isAdmin }: AppShellProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarVisible, setIsDesktopSidebarVisible] = useState(true);

  const isSidebarOpen = isDesktop
    ? isDesktopSidebarVisible
    : isMobileSidebarOpen;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const syncLayoutMode = () => {
      setIsDesktop(mediaQuery.matches);
      if (mediaQuery.matches) {
        setIsMobileSidebarOpen(false);
      }
    };

    syncLayoutMode();
    mediaQuery.addEventListener("change", syncLayoutMode);

    return () => {
      mediaQuery.removeEventListener("change", syncLayoutMode);
    };
  }, []);

  useEffect(() => {
    if (isDesktop) {
      return;
    }

    document.body.style.overflow = isMobileSidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isDesktop, isMobileSidebarOpen]);

  const handleMenuToggle = () => {
    if (isDesktop) {
      setIsDesktopSidebarVisible((prev) => !prev);
      return;
    }

    setIsMobileSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header
        brandName="문샤인랜드"
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        isSidebarOpen={isSidebarOpen}
        onMenuToggle={handleMenuToggle}
      />

      <div className="relative flex h-[calc(100dvh-3rem)] w-full flex-1 items-stretch overflow-hidden">
        {/* Mobile backdrop */}
        <button
          type="button"
          aria-label="사이드바 닫기"
          onClick={() => setIsMobileSidebarOpen(false)}
          className={cn(
            "fixed inset-0 top-12 z-40 bg-slate-900/35 transition-opacity duration-300 lg:hidden",
            isMobileSidebarOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          )}
        />

        {/* Mobile fixed overlay sidebar */}
        <div
          className={cn(
            "fixed left-0 top-12 z-50 h-[calc(100dvh-3rem)] transform shadow-xl transition-transform duration-300 ease-out lg:hidden",
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar isAdmin={isAdmin} onItemClick={() => setIsMobileSidebarOpen(false)} />
        </div>

        {/* Desktop in-flow sidebar with sticky viewport height and independent scroll */}
        <div
          className={cn(
            "sticky top-12 hidden h-[calc(100dvh-3rem)] shrink-0 self-start overflow-hidden transition-[width] duration-300 ease-out lg:block",
            isDesktopSidebarVisible ? "w-36" : "w-0",
          )}
        >
          <Sidebar isAdmin={isAdmin} />
        </div>

        <main className="box-border h-full min-w-0 flex-1 overflow-y-auto bg-slate-100 px-4 py-5 sm:px-6">
          <div className="min-h-full border border-slate-300/70 bg-slate-50 px-3 py-4 sm:px-5 sm:py-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
