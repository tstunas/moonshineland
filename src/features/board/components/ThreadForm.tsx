"use client";

export function ThreadForm({ boardKey }: { boardKey: string }) {
	const toolbarButtons = [
		{ label: "말풍선", text: "Q" },
		{ label: "폰트", text: "A" },
		{ label: "미리보기", text: "O" },
		{ label: "위로", text: "^" },
		{ label: "아래로", text: "v" },
		{ label: "되돌리기", text: "R" },
	];

	return (
		<form className="rounded-lg border border-sky-200 bg-slate-100 p-4">
			<input type="hidden" name="boardKey" value={boardKey} />

			<div className="mb-3 flex items-center gap-1.5">
				{toolbarButtons.map((button) => (
					<button
						key={button.label}
						type="button"
						aria-label={button.label}
						className="inline-flex h-8 w-8 items-center justify-center rounded border border-sky-300 bg-slate-50 text-[15px] font-semibold text-slate-700 transition-colors hover:bg-sky-50"
					>
						{button.text}
					</button>
				))}
			</div>

			<div className="flex flex-col gap-3">
				<input
					name="title"
					type="text"
					placeholder="제목을 입력하세요"
					className="h-11 rounded border border-sky-200 bg-slate-50 px-3 text-[16px] text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
				/>
				<input
					name="author"
					type="text"
					placeholder="이름을 입력하세요"
					className="h-11 rounded border border-sky-200 bg-slate-50 px-3 text-[16px] text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
				/>
				<input
					name="console"
					type="text"
					placeholder="콘솔을 입력하세요"
					className="h-11 rounded border border-sky-200 bg-slate-50 px-3 text-[16px] text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
				/>
			</div>

			<textarea
				name="content"
				placeholder="내용을 입력하세요"
				rows={5}
				className="mt-3 w-full resize-y rounded border border-sky-200 bg-slate-50 px-3 py-3 text-[16px] leading-relaxed text-slate-900 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
			/>

			<div className="mt-4">
				<label
					htmlFor="thread-image"
					className="group inline-flex cursor-pointer items-center gap-4 rounded-xl border border-sky-300 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-4 py-3 text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md"
				>
					<span className="flex items-center gap-3">
						<span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-[22px] leading-none text-white shadow-sm transition-colors group-hover:bg-sky-600">
							+
						</span>
						<span className="text-[19px] font-semibold">이미지 첨부</span>
					</span>
					<span className="text-[15px] text-slate-500">PNG, JPG</span>
				</label>
				<input id="thread-image" name="image" type="file" accept="image/*" className="sr-only" />
			</div>

			<button
				type="submit"
				className="mt-4 h-11 w-full rounded bg-sky-500 text-[20px] font-semibold text-white transition-colors hover:bg-sky-600"
			>
				작성
			</button>
		</form>
	);
}
