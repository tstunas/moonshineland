"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type GuideTocItem = {
  slug: string;
  title: string;
};

type MobileGuideTocProps = {
  docs: GuideTocItem[];
  activeSlug: string;
};

export function MobileGuideToc({ docs, activeSlug }: MobileGuideTocProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [isOpen]);

  return (
    <div className="fixed right-3 top-20 z-30 md:hidden">
      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        aria-expanded={isOpen}
        aria-controls="guide-mobile-toc-panel"
        className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white/95 px-3 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur"
      >
        목차
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-label="목차 닫기"
            onClick={() => {
              setIsOpen(false);
            }}
            className="fixed inset-0 -z-10 bg-slate-900/10"
          />

          <div
            id="guide-mobile-toc-panel"
            className="absolute right-0 mt-2 w-[78vw] max-w-72 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Guide Index
            </p>
            <ul className="mt-3 max-h-[58vh] space-y-1.5 overflow-y-auto pr-1">
              {docs.map((doc) => {
                const isActive = doc.slug === activeSlug;

                return (
                  <li key={doc.slug}>
                    <Link
                      href={`/guide/${doc.slug}`}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => {
                        setIsOpen(false);
                      }}
                      className={[
                        "block rounded-lg border px-2.5 py-2 text-sm transition",
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
        </>
      ) : null}
    </div>
  );
}