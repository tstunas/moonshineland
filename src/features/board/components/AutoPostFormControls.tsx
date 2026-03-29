"use client";

interface AutoPostFormControlsProps {
  isAutosizeEnabled: boolean;
  isBottomLockEnabled: boolean;
  onRefresh: () => Promise<void> | void;
  onLoadIdentity: () => void;
  onClearIdentity: () => void;
  onRepairAa: () => void;
  onToggleAutosize: () => void;
  onOpenPreview: () => void;
  onOpenDice: () => void;
  onToggleBottomLock: () => void;
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

export function AutoPostFormControls({
  isAutosizeEnabled,
  isBottomLockEnabled,
  onRefresh,
  onLoadIdentity,
  onClearIdentity,
  onRepairAa,
  onToggleAutosize,
  onOpenPreview,
  onOpenDice,
  onToggleBottomLock,
}: AutoPostFormControlsProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        title="자동투하 레스 목록을 갱신합니다. (Ctrl+R)"
        onClick={() => {
          void onRefresh();
        }}
        className={toolbarButtonClass()}
      >
        ↻
      </button>
      <button
        type="button"
        title="로컬 스토리지에서 작성자 이름/콘솔 명령어를 불러옵니다. (Ctrl+Shift+Q)"
        onClick={onLoadIdentity}
        className={toolbarButtonClass()}
      >
        📥
      </button>
      <button
        type="button"
        title="작성자 이름/콘솔 명령어를 지웁니다."
        onClick={onClearIdentity}
        className={toolbarButtonClass()}
      >
        ✕
      </button>
      <button
        type="button"
        title="내용 입력칸 자동 높이를 토글합니다. (Ctrl+B)"
        onClick={onToggleAutosize}
        className={toolbarButtonClass(isAutosizeEnabled, !isAutosizeEnabled)}
      >
        A↕
      </button>
      <button
        type="button"
        title="깨진 AA를 보정합니다. (Ctrl+D)"
        onClick={onRepairAa}
        className={toolbarButtonClass()}
      >
        AA
      </button>
      <button
        type="button"
        title="현재 입력한 자동투하 레스 미리보기를 엽니다. (Ctrl+S)"
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
      <button
        type="button"
        title="하단 고정 모드를 토글합니다."
        onClick={onToggleBottomLock}
        className={toolbarButtonClass(
          isBottomLockEnabled,
          !isBottomLockEnabled,
        )}
      >
        ↓
      </button>
    </div>
  );
}
