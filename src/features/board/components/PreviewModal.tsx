"use client";

interface PreviewModalProps {
  content: string;
  author?: string;
  command?: string;
  modalTitle?: string;
  titleLine?: string;
  subLine?: string;
  onClose: () => void;
}

export function PreviewModal({
  content,
  author,
  command,
  modalTitle,
  titleLine,
  subLine,
  onClose,
}: PreviewModalProps) {
  const primaryLine =
    titleLine ?? `#? ${author || "이름 없음"}${command ? ` (${command})` : ""}`;
  const secondaryLine = subLine ?? "방금";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-xl border border-sky-200 bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-sky-200 bg-white px-5 py-3">
          <h2 className="text-base font-bold text-slate-800">
            {modalTitle ?? "👁 미리보기"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          <article className="overflow-hidden rounded-lg border border-sky-200 bg-white">
            <header className="border-b border-sky-200 bg-slate-200 px-6 py-4">
              <p className="text-[20px] leading-tight text-sky-900">
                {primaryLine}
              </p>
              <p className="mt-2 text-[16px] leading-tight text-slate-700">
                {secondaryLine}
              </p>
            </header>
            <div className="px-6 py-6">
              <p className="whitespace-pre-wrap break-words text-[16px] leading-relaxed text-slate-900">
                {content || "(내용 없음)"}
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
