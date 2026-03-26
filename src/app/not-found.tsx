import Link from "next/link";

import { HTTP_STATUS } from "@/lib/constants";

export default function NotFound() {
  return (
    <section className="grid h-full min-h-[70vh] w-full place-items-center">
      <div className="w-full max-w-2xl border border-slate-300 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
          Error {HTTP_STATUS.NOT_FOUND}
        </p>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          요청한 페이지를 찾을 수 없습니다
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          주소가 잘못 입력되었거나, 페이지가 이동 또는 삭제되었을 수 있습니다.
          계속 진행하려면 홈으로 돌아가 다시 탐색해 주세요.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-w-40 items-center justify-center rounded-md border border-sky-700 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            홈으로 이동
          </Link>

          <p className="text-xs text-slate-500 sm:text-sm">
            이전 페이지로 돌아가거나 네비게이션에서 다른 경로를 선택할 수도
            있습니다.
          </p>
        </div>
      </div>
    </section>
  );
}
