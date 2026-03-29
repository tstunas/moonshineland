"use client";

interface ThreadFormControlsProps {
  isAutosizeEnabled: boolean;
  onRefresh: () => void;
  onLoadIdentity: () => void;
  onClearIdentity: () => void;
  onToggleAutosize: () => void;
  onRepairAa: () => void;
  onOpenPreview: () => void;
  onOpenDice: () => void;
}

function toolbarButtonClass(active = false, danger = false): string {
  if (active) {
    return "inline-flex h-8 min-w-8 items-center justify-center rounded border border-sky-400 bg-sky-500 px-2 text-[14px] font-semibold text-white transition-colors hover:bg-sky-600";
  }
  if (danger) {
    return "inline-flex h-8 min-w-8 items-center justify-center rounded border border-rose-400 bg-rose-500 px-2 text-[14px] font-semibold text-white transition-colors hover:bg-rose-600";
  }
  return "inline-flex h-8 min-w-8 items-center justify-center rounded border border-sky-300 bg-slate-50 px-2 text-[14px] font-semibold text-slate-700 transition-colors hover:bg-sky-50";
}

export function ThreadFormControls({
  isAutosizeEnabled,
  onRefresh,
  onLoadIdentity,
  onClearIdentity,
  onToggleAutosize,
  onRepairAa,
  onOpenPreview,
  onOpenDice,
}: ThreadFormControlsProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        title="페이지를 새로고침합니다."
        onClick={onRefresh}
        className={toolbarButtonClass()}
      >
        ↻
      </button>
      <button
        type="button"
        title="로컬 스토리지에서 작성자 이름/콘솔 명령어를 불러옵니다."
        onClick={onLoadIdentity}
        className={toolbarButtonClass()}
      >
        📥
      </button>
      <button
        type="button"
        title="작성자 이름/콘솔 명령어를 지우고 저장값도 삭제합니다."
        onClick={onClearIdentity}
        className={toolbarButtonClass()}
      >
        ✕
      </button>
      <button
        type="button"
        title="내용 입력칸 자동 높이를 토글합니다."
        onClick={onToggleAutosize}
        className={toolbarButtonClass(isAutosizeEnabled, !isAutosizeEnabled)}
      >
        A↕
      </button>
      <button
        type="button"
        title="깨진 AA를 보정합니다."
        onClick={onRepairAa}
        className={toolbarButtonClass()}
      >
        AA
      </button>
      <button
        type="button"
        title="현재 입력한 스레드 미리보기를 엽니다."
        onClick={onOpenPreview}
        className={toolbarButtonClass()}
      >
        👁
      </button>
      <button
        type="button"
        title="주사위 명령어 생성기를 엽니다."
        onClick={onOpenDice}
        className={toolbarButtonClass()}
      >
        🎲
      </button>
    </div>
  );
}
