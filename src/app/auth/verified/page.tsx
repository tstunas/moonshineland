"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function EmailVerifiedPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const nextPath = searchParams.get("next") ?? "/";
    const safeNextPath = nextPath.startsWith("/") ? nextPath : "/";

    window.location.replace(safeNextPath);
  }, [searchParams]);

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-xl items-center justify-center px-4 py-12 text-center">
      <div className="rounded-2xl border border-slate-300 bg-white px-6 py-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">이메일 인증 완료</h1>
        <p className="mt-2 text-sm text-slate-600">
          로그인 상태를 반영하는 중입니다. 잠시만 기다려주세요.
        </p>
      </div>
    </div>
  );
}
