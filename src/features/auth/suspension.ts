const PERMANENT_SUSPENSION_YEAR = 9999;

export function parseSuspendedUntil(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isSuspended(suspendedUntil: Date | string | null | undefined): boolean {
  const parsed = parseSuspendedUntil(suspendedUntil);
  if (!parsed) {
    return false;
  }

  return parsed.getTime() > Date.now();
}

export function isPermanentSuspension(suspendedUntil: Date | string | null | undefined): boolean {
  const parsed = parseSuspendedUntil(suspendedUntil);
  if (!parsed) {
    return false;
  }

  return parsed.getUTCFullYear() >= PERMANENT_SUSPENSION_YEAR;
}

export function getSuspensionMessage(suspendedUntil: Date | string | null | undefined): string {
  const parsed = parseSuspendedUntil(suspendedUntil);
  if (!parsed || parsed.getTime() <= Date.now()) {
    return "";
  }

  if (isPermanentSuspension(parsed)) {
    return "영구 정지된 계정입니다. 운영진에 문의해주세요.";
  }

  const formatted = parsed.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  });
  return `정지된 계정입니다. ${formatted}까지 로그인 및 작성이 제한됩니다.`;
}
