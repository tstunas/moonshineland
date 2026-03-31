/**
 * 메모리 기반 Rate Limiting을 위한 유틸리티
 * 사용자의 중복 제출을 1초 내에 방지합니다.
 */

// {actionType:userId} -> lastActionTime (milliseconds)
const rateLimitMap = new Map<string, number>();

// Rate limit 검증 시간 (밀리초)
const RATE_LIMIT_WINDOW_MS = 1000; // 1초

/**
 * 사용자의 특정 액션에 대한 Rate Limit을 확인합니다.
 * 1초 이내에 동일 액션을 시도하면 false를 반환합니다.
 *
 * @param userId - 사용자 ID
 * @param actionType - 액션 타입 (예: "create-thread", "create-post", "create-auto-post")
 * @returns 액션 허용 여부 (true: 허용, false: 거부)
 */
export function checkRateLimit(userId: number, actionType: string): boolean {
  const now = Date.now();
  const key = `${actionType}:${userId}`;
  const lastActionTime = rateLimitMap.get(key);

  if (lastActionTime === undefined) {
    // 첫 요청이므로 허용하고 시간 기록
    rateLimitMap.set(key, now);
    return true;
  }

  const timeSinceLastAction = now - lastActionTime;

  if (timeSinceLastAction < RATE_LIMIT_WINDOW_MS) {
    // 1초 이내에 중복 시도
    return false;
  }

  // 1초 이상 경과했으므로 새로운 액션 허용하고 시간 업데이트
  rateLimitMap.set(key, now);
  return true;
}

/**
 * Rate Limit 맵을 초기화합니다. (테스트용)
 */
export function resetRateLimitMap(): void {
  rateLimitMap.clear();
}

/**
 * 특정 사용자의 Rate Limit 기록을 조회합니다. (테스트/모니터링용)
 */
export function getRateLimitInfo(userId: number): Record<string, number> {
  const result: Record<string, number> = {};
  const now = Date.now();

  for (const [key, lastTime] of rateLimitMap.entries()) {
    if (key.endsWith(`:${userId}`)) {
      result[key] = now - lastTime;
    }
  }

  return result;
}
