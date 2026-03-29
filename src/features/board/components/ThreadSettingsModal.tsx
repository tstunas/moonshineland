"use client";

interface ThreadSettingsModalProps {
  isOpen: boolean;
  threadTitle: string;
  threadPassword: string;
  clearPassword: boolean;
  threadIsHidden: boolean;
  threadIsSecret: boolean;
  allowOthersReply: boolean;
  isSavingThread: boolean;
  onClose: () => void;
  onSave: () => void;
  onThreadTitleChange: (value: string) => void;
  onThreadPasswordChange: (value: string) => void;
  onClearPasswordChange: (checked: boolean) => void;
  onThreadIsHiddenChange: (checked: boolean) => void;
  onThreadIsSecretChange: (checked: boolean) => void;
  onAllowOthersReplyChange: (checked: boolean) => void;
}

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-sky-100 bg-white px-3 py-2.5 text-sm text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50/70">
      <span className="font-medium">{label}</span>
      <span className="flex items-center gap-2">
        <span
          className={`text-xs font-semibold ${checked ? "text-sky-700" : "text-slate-500"}`}
        >
          {checked ? "ON" : "OFF"}
        </span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => {
            onChange(event.target.checked);
          }}
          className="peer sr-only"
        />
        <span className="relative inline-flex h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-sky-500">
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </span>
      </span>
    </label>
  );
}

export function ThreadSettingsModal({
  isOpen,
  threadTitle,
  threadPassword,
  clearPassword,
  threadIsHidden,
  threadIsSecret,
  allowOthersReply,
  isSavingThread,
  onClose,
  onSave,
  onThreadTitleChange,
  onThreadPasswordChange,
  onClearPasswordChange,
  onThreadIsHiddenChange,
  onThreadIsSecretChange,
  onAllowOthersReplyChange,
}: ThreadSettingsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-b from-white to-sky-50 shadow-2xl">
        <div className="flex items-center justify-between border-b border-sky-100 bg-white/90 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">스레드 정보 수정</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            닫기
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="space-y-2 rounded-xl border border-sky-100 bg-white/90 p-3 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700">제목</label>
            <input
              type="text"
              value={threadTitle}
              onChange={(event) => {
                onThreadTitleChange(event.target.value);
              }}
              className="h-11 w-full rounded-lg border border-sky-200 bg-slate-50 px-3 text-[15px] text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="space-y-2 rounded-xl border border-sky-100 bg-white/90 p-3 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700">
              패스워드(입력 시 변경)
            </label>
            <input
              type="password"
              value={threadPassword}
              onChange={(event) => {
                onThreadPasswordChange(event.target.value);
              }}
              className="h-11 w-full rounded-lg border border-sky-200 bg-slate-50 px-3 text-[15px] text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
            />
            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100">
              <input
                type="checkbox"
                checked={clearPassword}
                onChange={(event) => {
                  onClearPasswordChange(event.target.checked);
                }}
                className="h-4 w-4 accent-sky-500"
              />
              패스워드 제거
            </label>
          </div>

          <div className="space-y-2 rounded-xl border border-sky-100 bg-white/90 p-3 shadow-sm">
            <ToggleField
              label="숨김 상태"
              checked={threadIsHidden}
              onChange={onThreadIsHiddenChange}
            />
            <ToggleField
              label="비밀 여부"
              checked={threadIsSecret}
              onChange={onThreadIsSecretChange}
            />
            <ToggleField
              label="타인 레스 작성 가능"
              checked={allowOthersReply}
              onChange={onAllowOthersReplyChange}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSavingThread}
              className="h-11 flex-1 rounded-lg bg-sky-500 text-sm font-semibold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSavingThread ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
