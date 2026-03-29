// ============================================================================
// 개인선호설정 localStorage 키 모음
// ============================================================================

/** / 루트 접속 시 리다이렉트할 게시판 키 */
export const PREFS_PRIMARY_BOARD = "moonshineland:preferences:primary-board";

/** 모든 게시판에서 사용할 기본 닉네임 (게시판별 설정이 없을 때 폴백) */
export const PREFS_DEFAULT_AUTHOR = "moonshineland:preferences:default-author";

/** 알림 토스트 폰트 크기 (숫자: px 단위) */
export const PREFS_TOAST_SIZE = "moonshineland:preferences:toast-size";

// ============================================================================
// 기존 컴포넌트와 공유하는 키 (재사용 목적)
// ============================================================================

/** 게시판 필터: 성인 콘텐츠 포함 여부 */
export const PREFS_FILTER_INCLUDE_ADULT =
  "moonshineland:board:filters:includeAdultOnly";

/** 게시판 필터: 필터 패널 접힘 상태 */
export const PREFS_FILTER_COLLAPSED = "moonshineland:board:filters:collapsed";

/** 새 투고 알림 사운드 활성화 여부 */
export const PREFS_SOUND_ENABLED = "moonshine:post:soundEnabled";

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
