export default function Loading() {
	return (
		<section
			className="grid h-full min-h-[70vh] w-full place-items-center"
			aria-live="polite"
			aria-busy="true"
		>
			<div className="w-full max-w-2xl border border-slate-300 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
				<div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-sky-600" />

				<h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
					페이지를 불러오는 중입니다
				</h1>

				<p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
					요청한 내용을 준비하고 있습니다. 잠시만 기다려 주세요.
				</p>

				<p className="mt-2 text-xs text-slate-500 sm:text-sm">Loading...</p>
			</div>
		</section>
	);
}
