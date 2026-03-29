import { verifyAccessToken } from "@/lib/jwt";
import { cookies } from "next/headers";

export interface CurrentUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

/**
 * 현재 인증된 사용자를 반환합니다.
 * 인증되지 않은 경우 null을 반환합니다.
 * 서버 컴포넌트 및 서버 액션에서 사용합니다.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get("access_token")?.value;

  if (!token) return null;

  try {
    const payload = await verifyAccessToken(token);
    return {
      id: String(payload.sub),
      email: String(payload.email ?? ""),
      isAdmin: Boolean(payload.isAdmin),
    };
  } catch {
    return null;
  }
}
