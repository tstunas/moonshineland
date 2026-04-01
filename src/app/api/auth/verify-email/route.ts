import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { signAccessToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/login?error=" + encodeURIComponent("유효하지 않은 인증 링크입니다."), request.url),
    );
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // 만료된 미인증 계정 일괄 정리
  await prisma.user.deleteMany({
    where: {
      emailVerifiedAt: null,
      emailVerificationExpiresAt: { lt: new Date() },
    },
  });

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationTokenHash: tokenHash,
      emailVerifiedAt: null,
      emailVerificationExpiresAt: { gte: new Date() },
    },
  });

  if (!user) {
    return NextResponse.redirect(
      new URL(
        "/login?error=" + encodeURIComponent("인증 링크가 만료되었거나 이미 사용되었습니다. 다시 가입해주세요."),
        request.url,
      ),
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    },
  });

  const accessToken = await signAccessToken({
    sub: String(user.id),
    email: user.email,
    isAdultVerified: user.isAdultVerified,
    isAdmin: user.isAdmin,
  });

  const cookieStore = await cookies();
  cookieStore.set("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.redirect(new URL("/auth/verified?next=/", request.url));
}
