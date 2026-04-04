"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { cn } from "@/lib/cn";
import { BOARDS } from "@/lib/constants";
import {
  BOARD_CONTENT_WIDTH_DEFAULT,
  PREFS_BOARD_CONTENT_WIDTH,
  PREFS_BOARD_CONTENT_WIDTH_COOKIE,
  CSS_VAR_TOAST_SIZE,
  PREFS_FILTER_COLLAPSED,
  PREFS_FILTER_INCLUDE_ADULT,
  PREFS_FILTER_INCLUDE_ADULT_COOKIE,
  PREFS_PRIMARY_BOARD,
  PREFS_SOUND_ENABLED,
  PREFS_REPLY_ALARM_VOLUME,
  REPLY_ALARM_VOLUME_DEFAULT,
  REPLY_ALARM_VOLUME_MAX,
  REPLY_ALARM_VOLUME_MIN,
  PREFS_TOAST_SIZE,
  TOAST_SIZE_DEFAULT,
  TOAST_SIZE_MAX,
  TOAST_SIZE_MIN,
  normalizeBoardContentWidthPreference,
} from "@/lib/preferences";
import { useHideImagesPreference } from "@/hooks/useHideImagesPreference";

// ============================================================================
// 서브 컴포넌트
// ============================================================================

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 ease-in-out",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
        checked ? "bg-indigo-600" : "bg-slate-300",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow",
          "transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// 드래그 가능한 슬라이더
function DragSlider({
  value,
  onChange,
  min = TOAST_SIZE_MIN,
  max = TOAST_SIZE_MAX,
  unit = "px",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v)));

  const valueFromClientX = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return value;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return clamp(min + ratio * (max - min));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [min, max, value],
  );

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    onChange(valueFromClientX(e.clientX));
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    onChange(valueFromClientX(e.clientX));
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full select-none">
      {/* 트랙 */}
      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        className="relative h-5 cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") onChange(clamp(value - 1));
          if (e.key === "ArrowRight") onChange(clamp(value + 1));
        }}
      >
        {/* 배경 바 */}
        <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-slate-200" />
        {/* 채워진 바 */}
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-indigo-500"
          style={{ width: `${pct}%` }}
        />
        {/* 핸들 */}
        <div
          className={cn(
            "absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full",
            "bg-white shadow-md ring-2 ring-indigo-500",
            "transition-shadow hover:shadow-lg active:ring-indigo-600",
          )}
          style={{ left: `${pct}%` }}
        />
      </div>
      {/* 레이블 */}
      <div className="mt-1.5 flex justify-between text-xs text-slate-400">
        <span>
          작게 ({min}
          {unit})
        </span>
        <span className="font-semibold text-indigo-600">
          {value}
          {unit}
        </span>
        <span>
          크게 ({max}
          {unit})
        </span>
      </div>
    </div>
  );
}

// 토스트 미리보기
function ToastPreview({ size }: { size: number }) {
  return (
    <div
      className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
      style={{ fontSize: `${size}px` }}
    >
      <p className="mb-1 font-semibold text-slate-600">미리보기</p>
      <div className="flex items-center gap-2 rounded-md bg-white p-2.5 shadow-sm ring-1 ring-slate-200">
        <span className="text-green-500">✓</span>
        <span className="text-slate-700">새 투고 알림이 도착했습니다</span>
      </div>
    </div>
  );
}

// ============================================================================
// 메인 페이지
// ============================================================================

export default function PreferencesPage() {
  useEffect(() => {
    document.title = "문샤인랜드: 개인선호설정";
  }, []);

  const readBoardContentWidthPreference = () => {
    if (typeof window === "undefined") {
      return BOARD_CONTENT_WIDTH_DEFAULT;
    }

    const cookiePrefix = `${PREFS_BOARD_CONTENT_WIDTH_COOKIE}=`;
    const cookieRaw = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(cookiePrefix))
      ?.slice(cookiePrefix.length);
    const cookieValue = cookieRaw ? decodeURIComponent(cookieRaw) : null;

    if (cookieValue) {
      return normalizeBoardContentWidthPreference(cookieValue);
    }

    return normalizeBoardContentWidthPreference(
      window.localStorage.getItem(PREFS_BOARD_CONTENT_WIDTH),
    );
  };

  const readIncludeAdultPreference = () => {
    if (typeof window === "undefined") {
      return false;
    }

    const cookiePrefix = `${PREFS_FILTER_INCLUDE_ADULT_COOKIE}=`;
    const cookieRaw = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(cookiePrefix))
      ?.slice(cookiePrefix.length);

    if (cookieRaw !== undefined) {
      return decodeURIComponent(cookieRaw) === "1";
    }

    return window.localStorage.getItem(PREFS_FILTER_INCLUDE_ADULT) === "1";
  };

  // ── 주 게시판 ──────────────────────────────────────────────────────────────
  const [primaryBoard, setPrimaryBoard] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (window.localStorage.getItem(PREFS_PRIMARY_BOARD) ?? ""),
  );

  // ── 닉네임 ────────────────────────────────────────────────────────────────

  // ── 게시판 필터 ────────────────────────────────────────────────────────────
  const [includeAdult, setIncludeAdult] = useState(
    readIncludeAdultPreference,
  );
  const [filterCollapsed, setFilterCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(PREFS_FILTER_COLLAPSED) === "1",
  );
  const [boardContentWidth, setBoardContentWidth] = useState(
    readBoardContentWidthPreference,
  );
  const { hideImages, setHideImages } = useHideImagesPreference();

  // ── 알림 ──────────────────────────────────────────────────────────────────
  const [soundEnabled, setSoundEnabled] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(PREFS_SOUND_ENABLED) === "1",
  );
  const [replyAlarmVolume, setReplyAlarmVolume] = useState(() => {
    if (typeof window === "undefined") return REPLY_ALARM_VOLUME_DEFAULT;
    const stored = window.localStorage.getItem(PREFS_REPLY_ALARM_VOLUME);
    const parsed = stored ? Number(stored) : REPLY_ALARM_VOLUME_DEFAULT;
    if (Number.isNaN(parsed)) {
      return REPLY_ALARM_VOLUME_DEFAULT;
    }

    return Math.min(
      Math.max(parsed, REPLY_ALARM_VOLUME_MIN),
      REPLY_ALARM_VOLUME_MAX,
    );
  });
  const [toastSize, setToastSize] = useState(() => {
    if (typeof window === "undefined") return TOAST_SIZE_DEFAULT;
    const stored = window.localStorage.getItem(PREFS_TOAST_SIZE);
    return stored ? Number(stored) : TOAST_SIZE_DEFAULT;
  });

  // ── 저장 헬퍼 ─────────────────────────────────────────────────────────────
  const savePrimaryBoard = (val: string) => {
    setPrimaryBoard(val);
    if (val) window.localStorage.setItem(PREFS_PRIMARY_BOARD, val);
    else window.localStorage.removeItem(PREFS_PRIMARY_BOARD);
  };

  const saveIncludeAdult = (val: boolean) => {
    setIncludeAdult(val);
    window.localStorage.setItem(PREFS_FILTER_INCLUDE_ADULT, val ? "1" : "0");
    document.cookie = `${PREFS_FILTER_INCLUDE_ADULT_COOKIE}=${val ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  };

  const saveFilterCollapsed = (val: boolean) => {
    setFilterCollapsed(val);
    window.localStorage.setItem(PREFS_FILTER_COLLAPSED, val ? "1" : "0");
  };

  const saveBoardContentWidth = (val: "narrow" | "wide") => {
    setBoardContentWidth(val);
    window.localStorage.setItem(PREFS_BOARD_CONTENT_WIDTH, val);
    document.cookie = `${PREFS_BOARD_CONTENT_WIDTH_COOKIE}=${encodeURIComponent(val)}; path=/; max-age=31536000; samesite=lax`;
  };

  const saveHideImages = (val: boolean) => {
    setHideImages(val);
  };

  const saveSoundEnabled = (val: boolean) => {
    setSoundEnabled(val);
    window.localStorage.setItem(PREFS_SOUND_ENABLED, val ? "1" : "0");
  };

  const saveReplyAlarmVolume = (val: number) => {
    const clamped = Math.min(
      Math.max(Math.round(val), REPLY_ALARM_VOLUME_MIN),
      REPLY_ALARM_VOLUME_MAX,
    );
    setReplyAlarmVolume(clamped);
    window.localStorage.setItem(PREFS_REPLY_ALARM_VOLUME, String(clamped));
  };

  const saveToastSize = (val: number) => {
    setToastSize(val);
    window.localStorage.setItem(PREFS_TOAST_SIZE, String(val));
    // 현재 세션에 즉시 CSS 변수 반영
    document.documentElement.style.setProperty(CSS_VAR_TOAST_SIZE, `${val}px`);
  };

  /** 글쓰기 폼 자동 크기 조절 상태를 모든 게시판에 일괄 적용 */
  const applyAutosizeToAllBoards = (enabled: boolean) => {
    const val = enabled ? "1" : "0";
    for (const board of BOARDS) {
      window.localStorage.setItem(
        `moonshineland:form:${board.key}:post-autosize`,
        val,
      );
      window.localStorage.setItem(
        `moonshineland:form:${board.key}:thread-autosize`,
        val,
      );
    }
    setAutosizeFeedback(true);
    setTimeout(() => setAutosizeFeedback(false), 1800);
  };
  const [autosizeFeedback, setAutosizeFeedback] = useState(false);

  /** 기본 커맨드를 모든 게시판에 일괄 적용 */
  const applyCommandToAllBoards = (command: string) => {
    for (const board of BOARDS) {
      window.localStorage.setItem(
        `moonshineland:form:${board.key}:command`,
        command,
      );
    }
    setCommandFeedback(true);
    setTimeout(() => setCommandFeedback(false), 1800);
  };
  const [commandFeedback, setCommandFeedback] = useState(false);

  /** 모든 개인선호설정 초기화 */
  const resetAll = () => {
    if (!window.confirm("모든 개인선호설정을 초기화할까요?")) return;
    window.localStorage.removeItem(PREFS_PRIMARY_BOARD);
    window.localStorage.removeItem(PREFS_FILTER_INCLUDE_ADULT);
    window.localStorage.removeItem(PREFS_FILTER_COLLAPSED);
    window.localStorage.removeItem(PREFS_BOARD_CONTENT_WIDTH);
    window.localStorage.removeItem(PREFS_SOUND_ENABLED);
    window.localStorage.removeItem(PREFS_REPLY_ALARM_VOLUME);
    window.localStorage.removeItem(PREFS_TOAST_SIZE);
    document.cookie = `${PREFS_BOARD_CONTENT_WIDTH_COOKIE}=; path=/; max-age=0; samesite=lax`;
    document.cookie = `${PREFS_FILTER_INCLUDE_ADULT_COOKIE}=; path=/; max-age=0; samesite=lax`;
    setPrimaryBoard("");
    setIncludeAdult(false);
    setFilterCollapsed(false);
    setBoardContentWidth(BOARD_CONTENT_WIDTH_DEFAULT);
    setHideImages(true);
    setSoundEnabled(false);
    setReplyAlarmVolume(REPLY_ALARM_VOLUME_DEFAULT);
    saveToastSize(TOAST_SIZE_DEFAULT);
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <div className="mb-2">
        <h1 className="text-xl font-bold text-slate-900">개인선호설정</h1>
        <p className="mt-1 text-sm text-slate-500">
          설정은 이 브라우저의 localStorage에 저장되며, 일부는 SSR 동기화를 위해 쿠키도 사용합니다.
        </p>
      </div>

      {/* ── 주 게시판 ───────────────────────────────────────────────────── */}
      <Section
        title="주 게시판"
        description="/ 루트에 접속하면 선택한 게시판으로 바로 이동합니다."
      >
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              className={cn(
                "flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800",
                "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200",
              )}
              value={primaryBoard}
              onChange={(e) => savePrimaryBoard(e.target.value)}
            >
              <option value="">없음 (홈 화면 유지)</option>
              {BOARDS.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          {primaryBoard && (
            <p className="text-xs text-indigo-600">
              / 접속 시 /board/{primaryBoard}으로 이동합니다.
            </p>
          )}
        </div>
      </Section>

      {/* ── 게시판 필터 ────────────────────────────────────────────────── */}
      <Section
        title="게시판 필터"
        description="스레드 목록 필터의 기본 상태를 설정합니다."
      >
        <SettingRow
          label="성인 콘텐츠 기본 표시"
          description="성인 전용 스레드를 기본적으로 목록에 포함합니다."
        >
          <Toggle checked={includeAdult} onChange={saveIncludeAdult} />
        </SettingRow>
        <SettingRow
          label="필터 패널 기본으로 접기"
          description="게시판 접속 시 필터 패널이 닫힌 상태로 표시됩니다."
        >
          <Toggle checked={filterCollapsed} onChange={saveFilterCollapsed} />
        </SettingRow>

        <SettingRow
          label="게시판 좌우 여백"
          description="좁게는 공지사항과 같은 폭, 넓게는 전체 폭으로 표시됩니다."
        >
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => saveBoardContentWidth("narrow")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold transition-colors",
                boardContentWidth === "narrow"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50",
              )}
              aria-pressed={boardContentWidth === "narrow"}
            >
              좁게
            </button>
            <button
              type="button"
              onClick={() => saveBoardContentWidth("wide")}
              className={cn(
                "border-l border-slate-300 px-3 py-1.5 text-xs font-semibold transition-colors",
                boardContentWidth === "wide"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50",
              )}
              aria-pressed={boardContentWidth === "wide"}
            >
              넓게
            </button>
          </div>
        </SettingRow>

        <SettingRow
          label="이미지 기본 숨기기"
          description="초기값은 켜짐이며, 레스의 첨부/인라인 이미지를 기본으로 가립니다."
        >
          <Toggle checked={hideImages} onChange={saveHideImages} />
        </SettingRow>
      </Section>

      {/* ── 글쓰기 폼 ──────────────────────────────────────────────────── */}
      <Section
        title="글쓰기 폼"
        description="게시판별이 아닌 전체에 일괄 적용하는 글쓰기 기본 설정입니다."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            내용 자동 크기 조절
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            글쓰기 텍스트 영역이 내용에 맞춰 자동으로 커집니다.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => applyAutosizeToAllBoards(true)}
              className={cn(
                "flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors",
                autosizeFeedback
                  ? "border-green-300 bg-green-50 text-green-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {autosizeFeedback ? "✓ 적용됨" : "전체 켜기"}
            </button>
            <button
              type="button"
              onClick={() => applyAutosizeToAllBoards(false)}
              className={cn(
                "flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors",
                "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              전체 끄기
            </button>
          </div>
        </div>
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-700">기본 커맨드</p>
          <p className="mt-0.5 text-xs text-slate-500">
            모든 게시판 글쓰기 폼의 커맨드를 일괄 설정합니다.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => applyCommandToAllBoards("")}
              className={cn(
                "flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors",
                commandFeedback
                  ? "border-green-300 bg-green-50 text-green-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {commandFeedback ? "✓ 적용됨" : "일반 (기본)"}
            </button>
            <button
              type="button"
              onClick={() => applyCommandToAllBoards("aa")}
              className={cn(
                "flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors",
                "border-slate-300 bg-white font-mono text-slate-700 hover:bg-slate-50",
              )}
            >
              AA 모드
            </button>
          </div>
        </div>
      </Section>

      {/* ── 알림 설정 ──────────────────────────────────────────────────────── */}
      <Section title="알림 설정">
        <SettingRow
          label="새 투고 알림 사운드"
          description="새 글이 올라왔을 때 알림음을 재생합니다."
        >
          <Toggle checked={soundEnabled} onChange={saveSoundEnabled} />
        </SettingRow>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-sm font-medium text-slate-700">
            새 레스 알림 볼륨
          </p>
          <DragSlider
            value={replyAlarmVolume}
            onChange={saveReplyAlarmVolume}
            min={REPLY_ALARM_VOLUME_MIN}
            max={REPLY_ALARM_VOLUME_MAX}
            unit="%"
          />
          <p className="mt-2 text-xs text-slate-500">
            100%는 기본 크기, 200%는 약 2배 크기입니다.
          </p>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-sm font-medium text-slate-700">
            알림 토스트 크기
          </p>
          <DragSlider value={toastSize} onChange={saveToastSize} />
          <ToastPreview size={toastSize} />
        </div>
      </Section>

      {/* ── 초기화 ─────────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={resetAll}
          className={cn(
            "rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600",
            "transition-colors hover:bg-red-50 hover:border-red-300",
          )}
        >
          모든 설정 초기화
        </button>
      </div>
    </div>
  );
}
