import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/queries";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
	title: "문샤인랜드: 게시판 목록",
};

async function getBoards() {
	return prisma.board.findMany({
		orderBy: [{ isArchive: "asc" }, { isHidden: "asc" }, { id: "asc" }],
		select: {
			id: true,
			boardKey: true,
			name: true,
			description: true,
			isAdultOnly: true,
			isHidden: true,
			isSecret: true,
			isPrivate: true,
			isBasic: true,
			isArchive: true,
			_count: {
				select: {
					threads: true,
				},
			},
		},
	});
}

function createBoardBadges(board: {
	isAdultOnly: boolean;
	isArchive: boolean;
	isPrivate: boolean;
	isSecret: boolean;
	isHidden: boolean;
	isBasic: boolean;
}) {
	const badges: string[] = [];

	if (board.isAdultOnly) badges.push("성인");
	if (board.isArchive) badges.push("보관");
	if (board.isPrivate) badges.push("비공개");
	if (board.isSecret) badges.push("시크릿");
	if (board.isHidden) badges.push("숨김");
	if (board.isBasic) badges.push("기본");

	return badges;
}

export default async function BoardIndexPage() {
	const user = await getCurrentUser();
	if (!user) {
		redirect("/login?next=%2Fboard");
	}

	const boards = await getBoards();

	return (
		<section className="mx-auto w-full max-w-5xl py-2">
			<header className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(130deg,rgba(240,249,255,0.95),rgba(255,255,255,0.98)_45%,rgba(254,249,195,0.78))] px-6 py-7 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] sm:px-8 sm:py-8">
				<p className="text-xs font-semibold tracking-[0.2em] text-sky-700 uppercase">
					Board Directory
				</p>
				<h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
					게시판 목록
				</h1>
				<p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">
					전체 게시판 {boards.length}개를 한눈에 확인하고 원하는 공간으로 이동하세요.
				</p>
			</header>

			<ul className="mt-5 grid gap-4 sm:grid-cols-2">
				{boards.map((board) => {
					const badges = createBoardBadges(board);

					return (
						<li key={board.id}>
							<Link
								href={`/board/${board.boardKey}`}
								className="group flex h-full flex-col rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.35)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_24px_50px_-30px_rgba(14,116,144,0.35)]"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<h2 className="text-lg font-bold text-slate-900 group-hover:text-sky-900">
											{board.name}
										</h2>
										<p className="mt-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
											/{board.boardKey}
										</p>
									</div>
									<span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
										스레드 {board._count.threads}
									</span>
								</div>

								<p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">
									{board.description.trim() || "게시판 설명이 아직 등록되지 않았습니다."}
								</p>

								{badges.length > 0 ? (
									<div className="mt-4 flex flex-wrap gap-2">
										{badges.map((badge) => (
											<span
												key={`${board.id}-${badge}`}
												className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800"
											>
												{badge}
											</span>
										))}
									</div>
								) : (
									<div className="mt-4 text-xs text-slate-400">공개 일반 게시판</div>
								)}
							</Link>
						</li>
					);
				})}
			</ul>

			{boards.length === 0 ? (
				<div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-600">
					표시할 게시판이 없습니다.
				</div>
			) : null}
		</section>
	);
}
