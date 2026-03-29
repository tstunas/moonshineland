import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  GUIDE_DOCS,
  getGuideDocBySlug,
} from "../_lib/guide-docs";

interface GuideDetailPageProps {
  params: Promise<{ title: string }>;
}

export async function generateStaticParams() {
  return GUIDE_DOCS.map((doc) => ({
    title: doc.slug,
  }));
}

export async function generateMetadata(
  { params }: GuideDetailPageProps,
): Promise<Metadata> {
  const { title } = await params;
  const guideDoc = getGuideDocBySlug(title);

  if (!guideDoc) {
    return {
      title: "문샤인랜드: 가이드",
    };
  }

  return {
    title: `문샤인랜드: ${guideDoc.title}`,
  };
}

export default async function GuideDetailPage({ params }: GuideDetailPageProps) {
  const { title } = await params;
  const guideDoc = getGuideDocBySlug(title);

  if (!guideDoc) {
    notFound();
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4 px-2 py-2 md:flex-row md:gap-6">
      <aside className="md:sticky md:top-3 md:h-fit md:w-72">
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-500 uppercase">
            Guide Index
          </p>
          <h1 className="mt-2 text-xl font-black text-slate-900">문샤인랜드 가이드</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            기능, 단축키, 운영 철학을 문서별로 정리했습니다.
          </p>

          <ul className="mt-4 space-y-2">
            {GUIDE_DOCS.map((doc) => {
              const isActive = doc.slug === guideDoc.slug;

              return (
                <li key={doc.slug}>
                  <Link
                    href={`/guide/${doc.slug}`}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "block rounded-xl border px-3 py-2 text-sm transition",
                      isActive
                        ? "border-sky-300 bg-sky-50 text-sky-900"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white",
                    ].join(" ")}
                  >
                    {doc.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <header className="border-b border-slate-200 pb-4">
            <p className="text-xs font-semibold tracking-[0.22em] text-sky-700 uppercase">
              Guide
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
              {guideDoc.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">
              {guideDoc.summary}
            </p>
          </header>

          <div className="mt-5 space-y-5">
            {guideDoc.sections.map((section) => (
              <section
                key={section.heading}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <h3 className="text-lg font-bold text-slate-900">{section.heading}</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 sm:text-[15px]">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </article>
      </main>
    </div>
  );
}
