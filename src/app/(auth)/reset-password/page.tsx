import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  requestPasswordResetAction,
  resetPasswordWithTokenAction,
} from "@/features/auth/actions";

export const metadata: Metadata = {
  title: "문샤인랜드: 비밀번호 재설정",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{
    token?: string;
    error?: string;
    sent?: string;
    email?: string;
  }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token, error, sent, email } = await searchParams;

  async function submitRequest(formData: FormData) {
    "use server";

    const result = await requestPasswordResetAction(formData);

    if (result.success) {
      const requestedEmail = String(formData.get("email") ?? "")
        .trim()
        .toLowerCase();
      const query = new URLSearchParams({ sent: "1" });
      if (requestedEmail) {
        query.set("email", requestedEmail);
      }
      redirect(`/reset-password?${query.toString()}`);
    }

    redirect(`/reset-password?error=${encodeURIComponent(result.message)}`);
  }

  async function submitReset(formData: FormData) {
    "use server";

    const result = await resetPasswordWithTokenAction(formData);

    if (result.success) {
      redirect("/login?reset=done");
    }

    const currentToken = String(formData.get("token") ?? "").trim();
    const qs = new URLSearchParams({ error: result.message });
    if (currentToken) {
      qs.set("token", currentToken);
    }
    redirect(`/reset-password?${qs.toString()}`);
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-lg items-center justify-center px-3 py-6 sm:px-4">
      <section className="w-full overflow-hidden rounded-2xl border border-slate-300 bg-slate-50 p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">비밀번호 재설정</h1>
        <p className="mt-1 text-sm text-slate-600">
          {token
            ? "새 비밀번호를 입력해 계정 접속을 다시 활성화하세요."
            : "가입한 이메일로 비밀번호 재설정 링크를 보내드립니다."}
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {error}
          </p>
        ) : null}

        {sent === "1" ? (
          <p
            role="status"
            className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          >
            입력한 이메일로 계정이 존재하면 재설정 링크를 발송했습니다.
          </p>
        ) : null}

        {token ? (
          <form action={submitReset} className="mt-5 space-y-4">
            <input type="hidden" name="token" value={token} />

            <div>
              <label
                htmlFor="newPassword"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                새 비밀번호
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="8자 이상 입력"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                새 비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="한 번 더 입력"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
            >
              새 비밀번호 저장
            </button>
          </form>
        ) : (
          <form action={submitRequest} className="mt-5 space-y-4">
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
                defaultValue={email ?? ""}
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
            >
              재설정 링크 받기
            </button>
          </form>
        )}

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link
            href="/"
            className="text-slate-500 transition-colors hover:text-slate-700"
          >
            홈으로
          </Link>
          <Link
            href="/login"
            className="font-semibold text-sky-700 transition-colors hover:text-sky-800"
          >
            로그인으로
          </Link>
        </div>
      </section>
    </div>
  );
}
