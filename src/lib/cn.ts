/**
 * 클래스네임 합성 유틸리티
 * 조건부 클래스 병합을 위한 헬퍼 함수
 */

type ClassValue =
  | string
  | undefined
  | null
  | boolean
  | Record<string, boolean>
  | ClassValue[];

/**
 * 여러 클래스를 합치고 중복을 제거합니다
 * Tailwind CSS와 함께 사용하기에 좋습니다
 *
 * @example
 * cn('px-2 py-1', 'px-3') // 'py-1 px-3' (중복된 px 제거)
 * cn('text-black', { 'text-white': isDark }) // 조건부 클래스
 * cn(['flex', 'gap-2'], { 'flex-col': isVertical }) // 배열과 객체 혼합
 */
export function cn(...classes: ClassValue[]): string {
  const result = classes.flat().reduce<string>((str, value) => {
    if (typeof value === "string") {
      return str ? `${str} ${value}` : value;
    }

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Record<string, boolean> 타입의 객체 처리
      for (const [key, isActive] of Object.entries(value)) {
        if (isActive) {
          str = str ? `${str} ${key}` : key;
        }
      }
    }

    return str;
  }, "");

  return result.split(/\s+/).filter(Boolean).join(" ");
}

/**
 * 상충하는 Tailwind 클래스를 자동으로 병합합니다
 * (예: px-2와 px-3가 함께 있을 때 마지막 값만 유지)
 *
 * @example
 * mergeClasses('px-2 py-1', 'px-3') // 'py-1 px-3'
 * mergeClasses('bg-red-500', 'bg-blue-500') // 'bg-blue-500'
 */
export function mergeClasses(...classes: ClassValue[]): string {
  const classList = cn(...classes).split(" ");
  const classMap = new Map<string, string>();

  for (const cls of classList) {
    // 클래스의 프리픽스 추출 (예: 'px', 'bg', 'text')
    const prefix = cls.match(/^[a-z]+-/)?.[0] || cls;

    // 숫자 프리픽스 클래스 처리 (예: 'md:', 'lg:')
    if (cls.includes(":")) {
      classMap.set(cls, cls);
    } else {
      // 같은 프리픽스의 클래스가 이미 있으면 교체
      for (const [key] of classMap) {
        if (key.match(/^[a-z]+-/)?.[0] === prefix && !key.includes(":")) {
          classMap.delete(key);
          break;
        }
      }
      classMap.set(cls, cls);
    }
  }

  return Array.from(classMap.values()).join(" ");
}

/**
 * 조건부 클래스 적용을 위한 간단한 헬퍼
 *
 * @example
 * conditional('text-black', isDark && 'text-white')
 * // isDark가 true면 'text-black text-white', false면 'text-black'
 */
export function conditional(
  base: string,
  ...conditions: (string | false | undefined)[]
): string {
  return cn(base, ...conditions);
}
