"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  PREFS_FILTER_INCLUDE_ADULT,
  PREFS_FILTER_INCLUDE_ADULT_COOKIE,
} from "@/lib/preferences";

const ERROR_MESSAGES: Record<string, string> = {
  not_adult: "인증 결과 성인이 아닌 것으로 확인되었습니다.",
  token_failed: "BBaton 서버에서 인증 정보를 가져오지 못했습니다. 다시 시도해주세요.",
  user_info_failed: "BBaton 서버에서 유저 정보를 가져오지 못했습니다. 다시 시도해주세요.",
  missing_code: "인증 코드가 누락되었습니다. 다시 시도해주세요.",
  server_config_error: "서버 설정 오류가 발생했습니다. 관리자에게 문의해주세요.",
};

export function AdultRequiredClient({
  nextPath,
  shouldClearAdultFilter,
  bbatonAuthUrl,
  error,
}: {
  nextPath: string;
  shouldClearAdultFilter: boolean;
  bbatonAuthUrl: string;
  error?: string;
}) {
  useEffect(() => {
    if (!shouldClearAdultFilter) {
      return;
    }

    window.localStorage.removeItem(PREFS_FILTER_INCLUDE_ADULT);
    document.cookie = `${PREFS_FILTER_INCLUDE_ADULT_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }, [shouldClearAdultFilter]);

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "인증 중 오류가 발생했습니다. 다시 시도해주세요.") : null;

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

        {errorMessage && (
          <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={bbatonAuthUrl}
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
