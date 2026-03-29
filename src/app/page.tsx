"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { PREFS_PRIMARY_BOARD } from "@/lib/preferences";

const featureCards = [
  {
    title: "AA 연재와 참여",
    description:
      "AA를 중심으로 이야기를 이어 가고, 독자와 참가자가 한 장면 안에서 바로 반응을 주고받는 연재형 커뮤니티입니다.",
    accent: "from-amber-200 via-orange-100 to-white",
  },
  {
    title: "실시간 갱신",
    description:
      "새 글과 반응이 빠르게 반영되어 흐름이 끊기지 않습니다. 장면 전개와 리액션을 더 즉각적으로 체감할 수 있습니다.",
    accent: "from-sky-200 via-cyan-100 to-white",
  },
  {
    title: "편의 기능",
    description:
      "글 작성과 열람에 필요한 여러 보조 기능으로 연재, 정리, 참여를 더 매끄럽게 이어갈 수 있습니다.",
    accent: "from-emerald-200 via-lime-100 to-white",
  },
  {
    title: "ORPG와 번역판",
    description:
      "사람들과 함께 ORPG를 플레이하거나, 번역판에서 해외 AA 작품을 번역하고 감상하며 활동 범위를 넓힐 수 있습니다.",
    accent: "from-rose-200 via-pink-100 to-white",
  },
] as const;

const activitySteps = [
  "좌측 사이드바에서 관심 있는 게시판을 고르고 흐름을 둘러봅니다.",
  "연재 스레드를 열거나 기존 작품에 참여하며 장면을 이어 갑니다.",
  "개인선호설정에서 주 게시판을 정하고 더 빠르게 원하는 공간으로 이동합니다.",
];

const activityGroups = [
  {
    title: "연재",
    body: "AA 연출을 살린 본편, 외전, 단편을 쌓아 가며 이야기를 길게 이어 갈 수 있습니다.",
  },
  {
    title: "참여",
    body: "독자 반응, 즉석 앵커, 공동 진행처럼 실시간성이 중요한 참여 방식과 잘 맞습니다.",
  },
  {
    title: "확장",
    body: "ORPG 플레이와 번역판 감상을 오가며 한 사이트 안에서 여러 방식의 놀이를 즐길 수 있습니다.",
  },
] as const;

const reactionMoments = [
  {
    label: "장면 시작",
    title: "AA로 분위기를 깔고 이야기를 연다",
    body: "장면의 공기, 표정, 템포를 AA로 즉시 전달하면서 본편이나 상황극의 몰입을 끌어올립니다.",
  },
  {
    label: "실시간 반응",
    title: "독자와 참가자의 반응이 바로 붙는다",
    body: "새 글이 빠르게 갱신되어 리액션, 선택, 앵커가 한 흐름 안에서 이어집니다.",
  },
  {
    label: "다음 전개",
    title: "연재, 플레이, 번역 감상이 다시 이어진다",
    body: "한 번의 접속으로 연재를 읽고 참여하고, ORPG와 번역판까지 오가며 사이트를 넓게 즐길 수 있습니다.",
  },
] as const;

const quickFacts = ["AA 중심", "실시간 갱신", "참여형 연재", "ORPG", "번역판"] as const;

export default function Home() {
  const primaryBoard = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      return () => window.removeEventListener("storage", onStoreChange);
    },
    () => window.localStorage.getItem(PREFS_PRIMARY_BOARD),
    () => null,
  );

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_55%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.20),_transparent_45%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-32 h-80 bg-[radial-gradient(circle_at_center,_rgba(148,163,184,0.16),_transparent_60%)]" />

      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 px-1 py-1 sm:gap-8 lg:gap-10">
        <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98)_38%,rgba(224,242,254,0.9))] shadow-[0_24px_80px_-36px_rgba(15,23,42,0.45)] sm:rounded-[2rem]">
          <div className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1.25fr)_22rem] lg:gap-8 lg:px-10 lg:py-12">
            <div className="space-y-5 sm:space-y-6">
              <div className="inline-flex items-center rounded-full border border-amber-300/70 bg-white/75 px-4 py-1 text-xs font-semibold tracking-[0.24em] text-amber-900 uppercase backdrop-blur-sm">
                Moonshine Land Intro
              </div>

              <div className="space-y-4 sm:space-y-5">
                <h1
                  className="text-3xl leading-[1.1] font-black text-slate-900 sm:text-5xl"
                  style={{ fontFamily: "'Black Han Sans', var(--font-geist-sans), sans-serif" }}
                >
                  AA로 장면을 세우고,
                  <br />
                  실시간 반응으로 흐름을 잇는 공간
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-700 sm:text-base sm:leading-8">
                  문샤인랜드는 AA를 이용한 연재와 참여를 중심으로 움직이는 공간입니다.
                  누군가는 장면을 올리고, 누군가는 즉시 반응하며, 또 다른 누군가는 그 흐름을
                  이어 다음 전개를 만들어 냅니다. 빠른 갱신과 편의 기능, ORPG와 번역판까지
                  함께 담아 두어 한곳에서 읽고, 쓰고, 참여할 수 있게 만들었습니다.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {quickFacts.map((fact) => (
                  <span
                    key={fact}
                    className="rounded-full border border-slate-300/90 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 backdrop-blur-sm"
                  >
                    {fact}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                {primaryBoard ? (
                  <Link
                    href={`/board/${primaryBoard}`}
                    className="inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    주 게시판으로 이동
                  </Link>
                ) : null}
                <Link
                  href="/preferences"
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-white"
                >
                  개인선호설정 열기
                </Link>
                <Link
                  href="/guide"
                  className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50/90 px-5 py-3 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-100"
                >
                  이용 가이드 보기
                </Link>
              </div>
            </div>

            <aside className="rounded-[1.5rem] border border-slate-200/80 bg-slate-950 p-5 text-slate-50 shadow-[0_16px_50px_-32px_rgba(15,23,42,0.9)] sm:rounded-[1.75rem] sm:p-6">
              <p className="text-xs font-semibold tracking-[0.22em] text-sky-200 uppercase">
                How To Start
              </p>
              <ol className="mt-4 space-y-4">
                {activitySteps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-sky-200">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-sm leading-6 text-slate-200">{step}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-amber-200 uppercase">
                  Quick Note
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  주 게시판을 설정해 두면 다음부터는 더 빠르게 자주 찾는 공간으로
                  진입할 수 있습니다.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((card) => (
            <article
              key={card.title}
              className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_-28px_rgba(15,23,42,0.4)]"
            >
              <div className={`h-2 bg-gradient-to-r ${card.accent}`} />
              <div className="space-y-3 p-5">
                <h2 className="text-lg font-bold text-slate-900">{card.title}</h2>
                <p className="text-sm leading-6 text-slate-600">{card.description}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <article className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.35)] sm:rounded-[1.8rem] sm:px-7 sm:py-6">
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-500 uppercase">
              What You Can Do
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
              보는 것에서 끝나지 않고, 바로 참여할 수 있습니다
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {activityGroups.map((group) => (
                <div
                  key={group.title}
                  className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <p className="text-sm font-bold text-slate-900">{group.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{group.body}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(240,249,255,1),rgba(255,255,255,1))] px-5 py-5 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.28)] sm:rounded-[1.8rem] sm:px-7 sm:py-6">
            <p className="text-xs font-semibold tracking-[0.22em] text-sky-700 uppercase">
              Explore More
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-900">
              번역판과 아카이브도 함께 둘러보세요
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              현재 진행 중인 연재만이 아니라, 정리된 글과 번역된 작품을 천천히 따라가며
              사이트의 결을 익힐 수 있습니다.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/archive"
                className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                아카이브 보기
              </Link>
              <Link
                href="/matome"
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400"
              >
                번역판 보기
              </Link>
            </div>
          </article>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <article className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-950 text-white shadow-[0_22px_55px_-36px_rgba(15,23,42,0.75)] sm:rounded-[1.8rem]">
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <p className="text-xs font-semibold tracking-[0.24em] text-amber-200 uppercase">
                Scene Preview
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                이런 흐름으로 즐기는 사이트입니다
              </h2>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
              {reactionMoments.map((moment, index) => (
                <div key={moment.title} className="rounded-[1.3rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-300/15 text-sm font-bold text-amber-200">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.2em] text-sky-200 uppercase">
                        {moment.label}
                      </p>
                      <h3 className="mt-1 text-base font-bold text-white">
                        {moment.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {moment.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-5 py-5 shadow-[0_18px_46px_-34px_rgba(15,23,42,0.34)] sm:rounded-[1.8rem] sm:px-6 sm:py-6">
            <p className="text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase">
              For Readers And Players
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
              읽는 사람도, 쓰는 사람도, 함께 노는 사람도 머물 수 있게
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-700 sm:text-[15px]">
              <p>
                연재를 따라가며 반응을 남기고, 필요한 순간에는 직접 참여해 이야기에 손을 보탤 수
                있습니다. 실시간 갱신은 이 사이트의 핵심 감각을 만들어 줍니다.
              </p>
              <p>
                작성 보조 기능은 반복 작업을 덜어 주고, 아카이브와 번역판은 진행 중인 흐름과 별개로
                축적된 작품을 편하게 탐색할 수 있게 해 줍니다.
              </p>
              <p>
                ORPG를 함께 플레이하는 공간으로도 활용할 수 있어, 텍스트와 상호작용 중심의 놀이가
                자연스럽게 이어집니다.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/guide"
                className="inline-flex items-center rounded-full border border-slate-300 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                처음 이용한다면 가이드
              </Link>
              <Link
                href="/preferences"
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400"
              >
                환경 먼저 맞추기
              </Link>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

