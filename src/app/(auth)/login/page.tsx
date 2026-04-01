import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { loginAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/features/auth/queries";

export const metadata: Metadata = {
  title: "문샤인랜드: 로그인",
};

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    reset?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const { error, reset } = await searchParams;

  async function submitLogin(formData: FormData) {
    "use server";

    const result = await loginAction(formData);

    if (result.success) {
      redirect("/");
    }

    redirect(`/login?error=${encodeURIComponent(result.message)}`);
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-center px-2 py-6 sm:px-4">
      <section className="grid w-full overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-sm md:grid-cols-[1.05fr_1fr]">
        <div className="relative hidden min-h-[28rem] border-r border-slate-300 bg-gradient-to-b from-sky-700 via-sky-600 to-cyan-600 p-8 text-white md:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_48%),radial-gradient(circle_at_85%_35%,rgba(255,255,255,0.16),transparent_42%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-sky-100/90">
                MOONSHINELAND
              </p>
              <h1 className="mt-6 text-3xl font-bold leading-tight">
                연재의 흐름을,
                <br />
                로그인으로 이어가세요.
              </h1>
              <p className="mt-4 max-w-xs text-sm text-sky-100/95">
                게시판 진행 상황과 스레드 업데이트를 계속 확인하려면 계정으로
                접속해주세요.
              </p>
            </div>

            <ul className="space-y-2 text-sm text-sky-50/95">
              <li>실시간 게시판 반영</li>
              <li>개인 선호 설정 동기화</li>
              <li>스레드 이어보기</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-center bg-slate-50 p-5 sm:p-8">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">로그인</h2>
              <p className="mt-1 text-sm text-slate-600">
                문샤인랜드 계정으로 로그인하세요.
              </p>
            </div>

            {error ? (
              <p
                role="alert"
                className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                {error}
              </p>
            ) : null}

            <form action={submitLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  이메일
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700"
                  >
                    비밀번호
                  </label>
                  <Link
                    href="/reset-password"
                    className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
                  >
                    비밀번호 재설정
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="비밀번호를 입력하세요"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>

              {reset === "done" ? (
                <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.
                </p>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
              >
                로그인하기
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between text-sm">
              <Link
                href="/"
                className="text-slate-500 transition-colors hover:text-slate-700"
              >
                홈으로
              </Link>
              <div className="text-right text-slate-600">
                <p>
                  계정이 없나요?{" "}
                  <Link
                    href="/signup"
                    className="font-semibold text-sky-700 transition-colors hover:text-sky-800"
                  >
                    회원가입
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
