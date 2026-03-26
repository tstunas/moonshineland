/**
 * 포맷팅 유틸리티
 * 날짜, 시간, 숫자, 텍스트 등을 포맷팅합니다
 */

/**
 * 숫자를 천단위 쉼표로 포맷합니다
 * @example formatNumber(1000) // '1,000'
 */
export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * 숫자를 통화로 포맷합니다
 * @example formatCurrency(50000) // '₩50,000'
 */
export function formatCurrency(num: number, currency = "KRW"): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
  }).format(num);
}

/**
 * 날짜를 포맷합니다
 * @example formatDate(new Date()) // '2026. 3. 26.'
 */
export function formatDate(date: Date | string, format = "long"): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (format === "long") {
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (format === "short") {
    return d.toLocaleDateString("ko-KR");
  }

  if (format === "time") {
    return d.toLocaleTimeString("ko-KR");
  }

  return d.toLocaleString("ko-KR");
}

/**
 * 상대 시간을 포맷합니다
 * @example formatRelativeTime(new Date(Date.now() - 60000)) // '1분 전'
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return "방금 전";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}일 전`;
  if (seconds < 2419200) return `${Math.floor(seconds / 604800)}주 전`;
  if (seconds < 29030400) return `${Math.floor(seconds / 2419200)}개월 전`;
  if (seconds < 2903040000) return `${Math.floor(seconds / 29030400)}년 전`;

  return formatDate(d, "short");
}

/**
 * 문자열의 첫 글자를 대문자로 변환합니다
 * @example capitalize('hello') // 'Hello'
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 텍스트를 지정된 길이로 자르고 말줄임표를 붙입니다
 * @example truncate('Hello World', 5) // 'Hello...'
 */
export function truncate(str: string, length: number, suffix = "..."): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + suffix;
}

/**
 * 바이트 크기를 읽기 좋은 형식으로 변환합니다
 * @example formatBytes(1024) // '1 KB'
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return formatNumber(bytes / Math.pow(k, i), dm) + " " + sizes[i];
}

/**
 * 문자열을 slug 형식으로 변환합니다
 * @example slugify('Hello World') // 'hello-world'
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * 시간(분)을 HH:MM 형식으로 변환합니다
 * @example formatTime(125) // '02:05'
 */
export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * 날짜시간을 YYYY-MM-DD HH:mm:ss 형식으로 변환합니다
 * date는 Date 객체 또는 ISO 문자열, timestamp를 받을 수 있습니다
 */
export function formatDateTime(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}