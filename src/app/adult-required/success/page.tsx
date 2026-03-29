import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { verifyAccessToken } from "@/lib/jwt";

export const metadata: Metadata = {
  title: "문샤인랜드: 성인인증 완료",
};

export default async function AdultVerificationSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath =
    typeof next === "string" && next.startsWith("/") ? next : "/";

  // 실제로 성인인증이 완료된 유저인지 확인
  const token = (await cookies()).get("access_token")?.value;
  if (!token) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  try {
    const payload = await verifyAccessToken(token);
    if (!payload.isAdultVerified) {
      redirect(`/adult-required?next=${encodeURIComponent(nextPath)}`);
    }
  } catch {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-emerald-200 bg-[linear-gradient(180deg,_rgba(240,253,244,0.96),_rgba(255,255,255,0.98))] p-8 shadow-[0_18px_40px_-28px_rgba(16,185,129,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
          Verification Complete
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          성인인증이 완료되었습니다
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          성인인증에 성공했습니다. 이제 성인 전용 콘텐츠를 자유롭게 이용할 수
          있습니다.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={nextPath}
            className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-6 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            계속하기
          </Link>
        </div>
      </section>
    </div>
  );
}
