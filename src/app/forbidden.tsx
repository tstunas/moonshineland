import Link from "next/link";

import { HTTP_STATUS } from "@/lib/constants";

export default function Forbidden() {
  return (
    <section className="grid h-full min-h-[70vh] w-full place-items-center">
      <div className="w-full max-w-2xl border border-slate-300 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-700">
          Error {HTTP_STATUS.FORBIDDEN}
        </p>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          이 페이지에 접근할 권한이 없습니다
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          로그인은 되어 있지만 필요한 권한이 없어 요청한 페이지를 열 수 없습니다.
          관리자 권한이 필요한 영역이므로, 다른 메뉴로 이동해 계속 이용해 주세요.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-w-40 items-center justify-center rounded-md border border-sky-700 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            홈으로 이동
          </Link>

          <Link
            href="/guide"
            className="inline-flex min-w-40 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            가이드 보기
          </Link>
        </div>
      </div>
    </section>
  );
}