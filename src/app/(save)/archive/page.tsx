import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "문샤인랜드: 아카이브",
};

export default function ArchivePage() {
  return (
    <div className="flex h-full items-center justify-center">
      <h1 className="text-2xl font-bold text-slate-900">아카이브 페이지</h1>
    </div>
  );
}
