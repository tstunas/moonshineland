// ============================================================================
// 개인선호설정 localStorage 키 모음
// ============================================================================

/** / 루트 접속 시 리다이렉트할 게시판 키 */
export const PREFS_PRIMARY_BOARD = "moonshineland:preferences:primary-board";

/** 알림 토스트 폰트 크기 (숫자: px 단위) */
export const PREFS_TOAST_SIZE = "moonshineland:preferences:toast-size";

/** 게시판 콘텐츠 폭 (narrow | wide) */
export const PREFS_BOARD_CONTENT_WIDTH =
  "moonshineland:preferences:board-content-width";

/** 게시글/레스 이미지 기본 숨김 여부 */
export const PREFS_HIDE_IMAGES = "moonshineland:preferences:hide-images";

/** 게시판 콘텐츠 폭 SSR 동기화를 위한 쿠키 키 */
export const PREFS_BOARD_CONTENT_WIDTH_COOKIE =
  "moonshineland_pref_board_content_width";

export type BoardContentWidthPreference = "narrow" | "wide";

export const BOARD_CONTENT_WIDTH_DEFAULT: BoardContentWidthPreference =
  "narrow";

export const HIDE_IMAGES_DEFAULT = true;

export function normalizeBoardContentWidthPreference(
  value: string | null | undefined,
): BoardContentWidthPreference {
  return value === "wide" ? "wide" : BOARD_CONTENT_WIDTH_DEFAULT;
}

// ============================================================================
// 기존 컴포넌트와 공유하는 키 (재사용 목적)
// ============================================================================

/** 게시판 필터: 성인 콘텐츠 포함 여부 */
export const PREFS_FILTER_INCLUDE_ADULT =
  "moonshineland:board:filters:includeAdultOnly";

/** 게시판 필터: 성인 콘텐츠 포함 여부 SSR 동기화를 위한 쿠키 키 */
export const PREFS_FILTER_INCLUDE_ADULT_COOKIE =
  "moonshineland_pref_filter_include_adult";

/** 게시판 필터: 필터 패널 접힘 상태 */
export const PREFS_FILTER_COLLAPSED = "moonshineland:board:filters:collapsed";

/** 새 투고 알림 사운드 활성화 여부 */
export const PREFS_SOUND_ENABLED = "moonshine:post:soundEnabled";

/** 새 레스 알림 볼륨 (0~200 정수, 100이 기본) */
export const PREFS_REPLY_ALARM_VOLUME =
  "moonshineland:preferences:reply-alarm-volume";

export const REPLY_ALARM_VOLUME_MIN = 0;
export const REPLY_ALARM_VOLUME_MAX = 200;
export const REPLY_ALARM_VOLUME_DEFAULT = 100;

// ============================================================================
// 토스트 크기 범위
// ============================================================================

export const TOAST_SIZE_MIN = 11;
export const TOAST_SIZE_MAX = 22;
export const TOAST_SIZE_DEFAULT = 14;

// ============================================================================
// CSS 변수 이름
// ============================================================================

/** html 요소에 적용될 토스트 폰트 크기 CSS 변수 */
export const CSS_VAR_TOAST_SIZE = "--pref-toast-font-size";
