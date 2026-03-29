import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "문샤인랜드: 마토메",
};

export default function MatomePage() {
  return (
    <div className="flex h-full items-center justify-center">
      <h1 className="text-2xl font-bold text-slate-900">마토메 페이지</h1>
    </div>
  );
}
