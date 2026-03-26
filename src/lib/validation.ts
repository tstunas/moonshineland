/**
 * 유효성 검사 유틸리티
 * 이메일, 전화번호, URL 등을 검증합니다
 */

/**
 * 이메일 형식이 유효한지 확인합니다
 * @example isValidEmail('user@example.com') // true
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * URL이 유효한지 확인합니다
 * @example isValidUrl('https://example.com') // true
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 문자열이 비어있거나 공백만 있는지 확인합니다
 * @example isEmpty('  ') // true
 */
export function isEmpty(str: string): boolean {
  return !str || str.trim().length === 0;
}

/**
 * 문자열의 길이가 범위 내에 있는지 확인합니다
 * @example isLengthInRange('hello', 3, 10) // true
 */
export function isLengthInRange(str: string, min: number, max: number): boolean {
  return str.length >= min && str.length <= max;
}

/**
 * 숫자가 범위 내에 있는지 확인합니다
 * @example isInRange(5, 1, 10) // true
 */
export function isInRange(num: number, min: number, max: number): boolean {
  return num >= min && num <= max;
}

/**
 * 문자열이 숫자만 포함하는지 확인합니다
 * @example isNumeric('12345') // true
 */
export function isNumeric(str: string): boolean {
  return /^\d+$/.test(str);
}

/**
 * 객체의 필수 키가 모두 있는지 확인합니다
 * @example hasRequiredKeys({a: 1, b: 2}, ['a', 'b']) // true
 */
export function hasRequiredKeys<T extends object>(
  obj: T,
  keys: (keyof T)[]
): boolean {
  return keys.every(key => key in obj);
}

/**
 * 값이 null 또는 undefined가 아닌지 확인합니다
 * @example isDefined(123) // true
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
