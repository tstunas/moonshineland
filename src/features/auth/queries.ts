import { verifyAccessToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";

export interface CurrentUser {
  id: string;
  email: string;
  isAdmin: boolean;
  isAdultVerified: boolean;
}

export interface CurrentUserProfile {
  id: number;
  username: string;
  email: string;
  avatarUrl: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  passwordResetRequired: boolean;
}

/**
 * 현재 인증된 사용자를 반환합니다.
 * 인증되지 않은 경우 null을 반환합니다.
 * 서버 컴포넌트 및 서버 액션에서 사용합니다.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  noStore();

  const token = (await cookies()).get("access_token")?.value;

  if (!token) return null;

  try {
    const payload = await verifyAccessToken(token);
    return {
      id: String(payload.sub),
      email: String(payload.email ?? ""),
      isAdmin: Boolean(payload.isAdmin),
      isAdultVerified: Boolean(payload.isAdultVerified),
    };
  } catch {
    return null;
  }
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: Number(user.id) },
    select: {
      id: true,
      username: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
      lastLoginAt: true,
      passwordResetRequired: true,
    },
  });
}
