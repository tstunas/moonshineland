/**
 * 애플리케이션 상수
 * API 경로, HTTP 상태코드, 설정값 등
 */

// ============================================================================
// API
// ============================================================================

export const API_ENDPOINTS = {
  // 사용자
  USERS: "/api/users",
  USER: (id: string) => `/api/users/${id}`,
  USER_PROFILE: "/api/users/profile",

  // 인증
  AUTH_LOGIN: "/api/auth/login",
  AUTH_LOGOUT: "/api/auth/logout",
  AUTH_REGISTER: "/api/auth/register",
  AUTH_REFRESH: "/api/auth/refresh",
} as const;

// ============================================================================
// HTTP 상태코드
// ============================================================================

export const HTTP_STATUS = {
  // 2xx 성공
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // 3xx 리다이렉트
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // 4xx 클라이언트 에러
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx 서버 에러
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// ============================================================================
// 로컬 스토리지 키
// ============================================================================

export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  REFRESH_TOKEN: "refresh_token",
  USER_PREFERENCES: "user_preferences",
  THEME: "theme",
  LANGUAGE: "language",
} as const;

// ============================================================================
// 시간 관련 상수 (밀리초)
// ============================================================================

export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// 페이지네이션
// ============================================================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ============================================================================
// 숫자 범위
// ============================================================================

export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
} as const;

// ============================================================================
// 정렬
// ============================================================================

export const SORT_ORDER = {
  ASC: "asc",
  DESC: "desc",
} as const;

// ============================================================================
// 사용자 역할
// ============================================================================

export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  GUEST: "guest",
} as const;

// ============================================================================
// 알림 타입
// ============================================================================

export const NOTIFICATION_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
} as const;

// ============================================================================
// 정규식
// ============================================================================

export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  KOREAN_CHAR: /[가-힣]/,
  SPECIAL_CHAR: /[!@#$%^&*]/,
} as const;

// ============================================================================
// 게시판 상수
// ============================================================================
export const BOARDS = [
  { key: "anchor", label: "앵커판" },
  { key: "orpg", label: "OR판" },
  { key: "test", label: "테스트판" },
  { key: "trans", label: "번역판" },
  { key: "honor", label: "명예의 전당" },
] as const;
