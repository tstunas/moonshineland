"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { PREFS_PRIMARY_BOARD } from "@/lib/preferences";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const primaryBoard = window.localStorage.getItem(PREFS_PRIMARY_BOARD);
    if (primaryBoard) {
      router.replace(`/board/${primaryBoard}`);
    }
  }, [router]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <p className="text-lg font-semibold text-slate-700">문샤인랜드</p>
      <p className="text-sm text-slate-500">
        좌측 사이드바에서 게시판을 선택하거나,{" "}
        <a href="/preferences" className="text-indigo-600 underline hover:text-indigo-800">
          개인선호설정
        </a>
        에서 주 게시판을 지정하세요.
      </p>
    </div>
  );
}

