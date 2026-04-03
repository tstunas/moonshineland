import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { signAccessToken, verifyAccessToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";

interface BbatonTokenResponse {
  access_token: string;
  token_type: string;
}

interface BbatonUserInfo {
  user_id: string;
  adult_flag: string;
  income_flag: string;
  gender: string;
  birthdate: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // state로 전달된 next 경로를 복원 (open redirect 방지: 반드시 /로 시작해야 함)
  const nextPath =
    typeof state === "string" && state.startsWith("/") ? state : "/";

  if (!code) {
    redirect(
      `/adult-required?next=${encodeURIComponent(nextPath)}&error=missing_code`,
    );
  }

  // 로그인 쿠키 확인
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  let userId: string;
  try {
    const payload = await verifyAccessToken(token);
    userId = payload.sub as string;
  } catch {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  // BBaton 인증 코드 → 액세스 토큰 교환
  const clientId = process.env.BBATON_CLIENT_ID;
  const secretKey = process.env.BBATON_SECRET_KEY;
  const redirectUri = process.env.BBATON_REDIRECT_URI;

  if (!clientId || !secretKey || !redirectUri) {
    redirect(
      `/adult-required?next=${encodeURIComponent(nextPath)}&error=server_config_error`,
    );
  }

  const basicAuth = Buffer.from(`${clientId}:${secretKey}`).toString("base64");

  // BBaton 인증 코드 → 액세스 토큰
  const bbatonToken = await (async (): Promise<BbatonTokenResponse> => {
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("redirect_uri", redirectUri);
    params.append("code", code);

    const tokenRes = await fetch("https://bauth.bbaton.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      redirect(
        `/adult-required?next=${encodeURIComponent(nextPath)}&error=token_failed`,
      );
    }

    return tokenRes.json() as Promise<BbatonTokenResponse>;
  })().catch(() =>
    redirect(
      `/adult-required?next=${encodeURIComponent(nextPath)}&error=token_failed`,
    ),
  );

  // BBaton 유저 정보 조회
  const bbatonUser = await (async (): Promise<BbatonUserInfo> => {
    const userRes = await fetch("https://bapi.bbaton.com/v2/user/me", {
      headers: {
        Authorization: `${bbatonToken.token_type} ${bbatonToken.access_token}`,
      },
    });

    if (!userRes.ok) {
      redirect(
        `/adult-required?next=${encodeURIComponent(nextPath)}&error=user_info_failed`,
      );
    }

    return userRes.json() as Promise<BbatonUserInfo>;
  })().catch(() =>
    redirect(
      `/adult-required?next=${encodeURIComponent(nextPath)}&error=user_info_failed`,
    ),
  );

  // 성인 여부 확인
  if (bbatonUser.adult_flag !== "Y") {
    redirect(
      `/adult-required?next=${encodeURIComponent(nextPath)}&error=not_adult`,
    );
  }

  // DB 업데이트 및 JWT 재발급
  const user = await prisma.user.update({
    where: { id: parseInt(userId, 10) },
    data: { isAdultVerified: true },
  });

  const newToken = await signAccessToken({
    sub: String(user.id),
    email: user.email,
    isAdultVerified: user.isAdultVerified,
  });

  cookieStore.set("access_token", newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(
    `/adult-required/success?next=${encodeURIComponent(nextPath)}`,
  );
}
