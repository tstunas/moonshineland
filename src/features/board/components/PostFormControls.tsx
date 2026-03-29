"use client";

interface PostFormControlsProps {
  canManageThread: boolean;
  isAutosizeEnabled: boolean;
  isBottomLockEnabled: boolean;
  isReplyAlertEnabled: boolean;
  isAdminMenuOpen: boolean;
  threadPostLimit: number;
  onRefresh: () => Promise<void> | void;
  onLoadIdentity: () => void;
  onClearIdentity: () => void;
  onRepairAa: () => void;
  onToggleAutosize: () => void;
  onOpenPreview: () => void;
  onOpenDice: () => void;
  onToggleBottomLock: () => void;
  onToggleReplyAlert: () => void;
  onToggleAdminMenu: () => void;
  onAdjustPostLimit: (delta: 1000 | -1000) => Promise<void> | void;
  onCopyExternalText: () => Promise<void> | void;
  onCopyExternalHtml: () => Promise<void> | void;
  onCopyExternalImage: () => Promise<void> | void;
  onOpenThreadSettings: () => void;
  onOpenAutoManagePage: () => void;
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

export function PostFormControls({
  canManageThread,
  isAutosizeEnabled,
  isBottomLockEnabled,
  isReplyAlertEnabled,
  isAdminMenuOpen,
  threadPostLimit,
  onRefresh,
  onLoadIdentity,
  onClearIdentity,
  onRepairAa,
  onToggleAutosize,
  onOpenPreview,
  onOpenDice,
  onToggleBottomLock,
  onToggleReplyAlert,
  onToggleAdminMenu,
  onAdjustPostLimit,
  onCopyExternalText,
  onCopyExternalHtml,
  onCopyExternalImage,
  onOpenThreadSettings,
  onOpenAutoManagePage,
}: PostFormControlsProps) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          title="레스 목록의 이후 레스들을 갱신합니다."
          onClick={() => {
            void onRefresh();
          }}
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
          title="현재 입력한 레스 미리보기를 엽니다."
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
        <button
          type="button"
          title="비활성 탭에서 새 레스이 오면 소리로 알립니다."
          onClick={onToggleReplyAlert}
          className={toolbarButtonClass(
            isReplyAlertEnabled,
            !isReplyAlertEnabled,
          )}
        >
          🔔
        </button>
        {canManageThread ? (
          <button
            type="button"
            title="스레드 관리자 메뉴를 엽니다."
            onClick={onToggleAdminMenu}
            className={toolbarButtonClass(isAdminMenuOpen, !isAdminMenuOpen)}
          >
            🛠
          </button>
        ) : (
          <button
            type="button"
            title="스레드 관리자 메뉴는 관리자 또는 스레드 소유자 권한이 필요합니다."
            disabled
            className="inline-flex h-8 min-w-8 cursor-not-allowed items-center justify-center rounded border border-rose-400 bg-rose-500/90 px-2 text-[14px] font-semibold text-white/90"
          >
            🔒
          </button>
        )}
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${canManageThread && isAdminMenuOpen ? "mb-3 max-h-80 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="flex flex-wrap items-center gap-2 rounded border border-sky-200 bg-white p-2">
          <button
            type="button"
            onClick={() => {
              void onAdjustPostLimit(-1000);
            }}
            className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            상한 -1000
          </button>
          <button
            type="button"
            onClick={() => {
              void onAdjustPostLimit(1000);
            }}
            className="rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100"
          >
            상한 +1000
          </button>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
            현재 상한 {threadPostLimit}
          </span>
          <button
            type="button"
            onClick={() => {
              void onCopyExternalText();
            }}
            className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            외부게시용 텍스트 복사
          </button>
          <button
            type="button"
            onClick={() => {
              void onCopyExternalHtml();
            }}
            className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            외부게시용 HTML 복사
          </button>
          <button
            type="button"
            onClick={() => {
              void onCopyExternalImage();
            }}
            className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            외부게시용 이미지 복사
          </button>
          <button
            type="button"
            onClick={onOpenThreadSettings}
            className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
          >
            스레드 정보 수정
          </button>
          <button
            type="button"
            onClick={onOpenAutoManagePage}
            className="rounded border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            자동투하 관리 페이지
          </button>
        </div>
      </div>
    </>
  );
}
