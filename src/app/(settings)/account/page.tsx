import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  changeMyPasswordAction,
  requestPasswordResetAction,
  updateMyProfileAction,
} from "@/features/auth/actions";
import { getCurrentUserProfile } from "@/features/auth/queries";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "문샤인랜드: 계정 관리",
};

interface AccountPageProps {
  searchParams: Promise<{
    error?: string;
    profile?: string;
    password?: string;
    reset?: string;
  }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login?next=%2Faccount");
  }

  const { error, profile: profileState, password, reset } = await searchParams;

  async function submitProfile(formData: FormData) {
    "use server";

    const result = await updateMyProfileAction(formData);

    if (result.success) {
      redirect("/account?profile=saved");
    }

    redirect(`/account?error=${encodeURIComponent(result.message)}`);
  }

  async function submitPassword(formData: FormData) {
    "use server";

    const result = await changeMyPasswordAction(formData);

    if (result.success) {
      redirect("/account?password=changed");
    }

    redirect(`/account?error=${encodeURIComponent(result.message)}`);
  }

  async function sendResetLink(formData: FormData) {
    "use server";

    const result = await requestPasswordResetAction(formData);

    if (result.success) {
      redirect("/account?reset=sent");
    }

    redirect(`/account?error=${encodeURIComponent(result.message)}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">계정 관리</h1>
        <p className="mt-1 text-sm text-slate-500">
          프로필과 보안 정보를 직접 관리할 수 있습니다.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {profileState === "saved" ? (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          프로필 정보가 저장되었습니다.
        </p>
      ) : null}

      {password === "changed" ? (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          비밀번호가 변경되었습니다.
        </p>
      ) : null}

      {reset === "sent" ? (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          비밀번호 재설정 링크를 발송했습니다.
        </p>
      ) : null}

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-800">계정 상태</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <p className="rounded-md bg-slate-50 px-3 py-2">이메일: {profile.email}</p>
          <p className="rounded-md bg-slate-50 px-3 py-2">닉네임: {profile.username}</p>
          <p className="rounded-md bg-slate-50 px-3 py-2">
            가입일: {formatDateTime(profile.createdAt)}
          </p>
          <p className="rounded-md bg-slate-50 px-3 py-2">
            최근 로그인: {profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : "기록 없음"}
          </p>
          <p className="rounded-md bg-slate-50 px-3 py-2">
            보안 상태: {profile.passwordResetRequired ? "비밀번호 재설정 필요" : "정상"}
          </p>
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-800">프로필 수정</h2>
        <form action={submitProfile} className="mt-4 space-y-4">
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
              maxLength={50}
              defaultValue={profile.username}
              autoComplete="username"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
          </div>

          <div>
            <label
              htmlFor="avatarUrl"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              아바타 URL
            </label>
            <input
              id="avatarUrl"
              name="avatarUrl"
              type="url"
              maxLength={512}
              defaultValue={profile.avatarUrl}
              placeholder="https://example.com/avatar.png"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            프로필 저장
          </button>
        </form>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-800">비밀번호 변경</h2>
        <form action={submitPassword} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="currentPassword"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              현재 비밀번호
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
          </div>

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
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            비밀번호 변경
          </button>
        </form>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-800">보안 도구</h2>
        <p className="mt-1 text-xs text-slate-500">
          현재 로그인 세션은 유지하면서, 같은 이메일로 비밀번호 재설정 링크를 즉시 받을 수 있습니다.
        </p>
        <form action={sendResetLink} className="mt-4">
          <input type="hidden" name="email" value={profile.email} />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            내 이메일로 재설정 링크 보내기
          </button>
        </form>
      </section>
    </div>
  );
}
