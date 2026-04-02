import { cn } from "@/lib/cn";

export function ImageVisibilityToggleRow({
  show,
  hideImages,
  hiddenImageCount,
  onToggle,
  className,
}: {
  show: boolean;
  hideImages: boolean;
  hiddenImageCount: number;
  onToggle: () => void;
  className?: string;
}) {
  if (!show) {
    return null;
  }

  return (
    <div className={cn("mb-2", className)}>
      <button
        type="button"
        onClick={onToggle}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] leading-none text-slate-700 hover:bg-slate-50"
      >
        {hideImages ? "이미지 펼치기" : "이미지 숨기기"}
      </button>
      {hideImages ? (
        <span className="ml-2 text-[11px] text-slate-500">
          ({hiddenImageCount}개 숨김)
        </span>
      ) : null}
    </div>
  );
}

export function HiddenAttachmentImageNotice({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) {
    return null;
  }

  return (
    <p className={cn("mb-3 text-xs text-slate-500", className)}>
      [첨부 이미지 {count}장 숨김]
    </p>
  );
}
