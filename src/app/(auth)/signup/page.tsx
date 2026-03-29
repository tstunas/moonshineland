import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { signupAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/features/auth/queries";

export const metadata: Metadata = {
  title: "문샤인랜드: 회원가입",
};

interface SignupPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const { error } = await searchParams;

  async function submitSignup(formData: FormData) {
    "use server";

    const result = await signupAction(formData);

    if (result.success) {
      redirect("/");
    }

    redirect(`/signup?error=${encodeURIComponent(result.message)}`);
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-center px-2 py-6 sm:px-4">
      <section className="grid w-full overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-sm md:grid-cols-[1fr_1.05fr]">
        <div className="flex items-center justify-center bg-slate-50 p-5 sm:p-8">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">회원가입</h1>
              <p className="mt-1 text-sm text-slate-600">
                문샤인랜드 계정을 만들고 게시판 활동을 시작하세요.
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

            <form action={submitSignup} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  닉네임
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  minLength={2}
                  autoComplete="username"
                  placeholder="2자 이상 입력"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>

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
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  비밀번호
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="8자 이상 입력"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
                <p className="mt-1 text-xs text-slate-500">
                  비밀번호는 최소 8자 이상이어야 합니다.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
              >
                회원가입하기
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between text-sm">
              <Link
                href="/"
                className="text-slate-500 transition-colors hover:text-slate-700"
              >
                홈으로
              </Link>
              <p className="text-slate-600">
                이미 계정이 있나요?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-sky-700 transition-colors hover:text-sky-800"
                >
                  로그인
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="relative hidden min-h-[28rem] border-l border-slate-300 bg-gradient-to-b from-cyan-600 via-sky-600 to-sky-700 p-8 text-white md:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.22),transparent_48%),radial-gradient(circle_at_20%_70%,rgba(255,255,255,0.16),transparent_42%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-cyan-100/90">
                JOIN MOONSHINELAND
              </p>
              <h2 className="mt-6 text-3xl font-bold leading-tight">
                당신의 다음 연재,
                <br />
                지금 시작하세요.
              </h2>
              <p className="mt-4 max-w-xs text-sm text-cyan-100/95">
                계정을 만들면 저장, 선호 설정, 스레드 흐름을 하나의 계정으로
                이어서 사용할 수 있습니다.
              </p>
            </div>

            <ul className="space-y-2 text-sm text-sky-50/95">
              <li>연재 기록 저장</li>
              <li>게시판 활동 연동</li>
              <li>개인 맞춤 환경설정</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
