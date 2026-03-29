"use client";

import Link from "next/link";
import { useEffect } from "react";

const FILTER_INCLUDE_ADULT_ONLY_KEY =
  "moonshineland:board:filters:includeAdultOnly";

export function AdultRequiredClient({
  nextPath,
  shouldClearAdultFilter,
}: {
  nextPath: string;
  shouldClearAdultFilter: boolean;
}) {
  useEffect(() => {
    if (!shouldClearAdultFilter) {
      return;
    }

    window.localStorage.removeItem(FILTER_INCLUDE_ADULT_ONLY_KEY);
  }, [shouldClearAdultFilter]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-rose-200 bg-[linear-gradient(180deg,_rgba(255,241,242,0.96),_rgba(255,255,255,0.98))] p-8 shadow-[0_18px_40px_-28px_rgba(190,24,93,0.45)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-600">
          Adult Verification Required
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          성인인증이 필요한 콘텐츠입니다
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          현재 계정은 성인 전용 콘텐츠를 볼 수 없습니다. 성인인증을 완료한 뒤
          다시 시도해주세요.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/settings/preferences"
            className="inline-flex h-10 items-center justify-center rounded-full bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-600"
          >
            성인인증 하러 가기
          </Link>
          <Link
            href={nextPath}
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            이전 화면으로 돌아가기
          </Link>
        </div>
      </section>
    </div>
  );
}
