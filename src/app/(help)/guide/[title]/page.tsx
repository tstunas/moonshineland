import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "문샤인랜드: 가이드 상세",
};

export default function GuideDetailPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <h1 className="text-2xl font-bold text-slate-900">가이드 상세 페이지</h1>
    </div>
  );
}
