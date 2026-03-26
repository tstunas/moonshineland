"use client";

import Link from "next/link";
import { useEffect } from "react";

import { HTTP_STATUS } from "@/lib/constants";

type AppErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function Error({ error, unstable_retry }: AppErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="grid h-full min-h-[70vh] w-full place-items-center">
      <div className="w-full max-w-2xl border border-slate-300 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-700">
          Error {HTTP_STATUS.INTERNAL_SERVER_ERROR}
        </p>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          예상치 못한 오류가 발생했습니다
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          일시적인 문제일 수 있으니 다시 시도해 주세요. 문제가 계속되면 잠시 후
          다시 접속해 주세요.
        </p>

        {error.digest ? (
          <p className="mt-3 text-xs text-slate-500 sm:text-sm">
            오류 식별자: {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={unstable_retry}
            className="inline-flex min-w-40 items-center justify-center rounded-md border border-rose-700 bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            다시 시도
          </button>

          <Link
            href="/"
            className="inline-flex min-w-40 items-center justify-center rounded-md border border-sky-700 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    </section>
  );
}
