"use server";

import { signAccessToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

export interface AuthActionResult {
  success: boolean;
  message: string;
}

const ACCESS_TOKEN_COOKIE = {
  name: "access_token",
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
} as const;

export async function loginAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { success: false, message: "이메일이나 비밀번호가 누락되었습니다." };
  }

  if (password.length < 8) {
    return { success: false, message: "비밀번호는 8자 이상이어야 합니다." };
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return {
        success: false,
        message: "가입한 아이디가 아니거나 비밀번호가 일치하지 않습니다.",
      };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return {
        success: false,
        message: "가입한 아이디가 아니거나 비밀번호가 일치하지 않습니다.",
      };
    }

    // 이메일 인증 여부 확인
    if (!user.emailVerifiedAt) {
      // 만료된 미인증 계정은 삭제
      if (
        user.emailVerificationExpiresAt &&
        user.emailVerificationExpiresAt < new Date()
      ) {
        await prisma.user.delete({ where: { id: user.id } });
        return {
          success: false,
          message: "인증 유효 기간이 만료된 계정입니다. 다시 가입해주세요.",
        };
      }
      return {
        success: false,
        message: "이메일 인증이 완료되지 않았습니다. 받은 인증 메일을 확인해주세요.",
      };
    }

    const accessToken = await signAccessToken({
      sub: String(user.id),
      email: user.email,
      isAdultVerified: user.isAdultVerified,
      isAdmin: user.isAdmin,
    });

    (await cookies()).set(
      ACCESS_TOKEN_COOKIE.name,
      accessToken,
      ACCESS_TOKEN_COOKIE.options,
    );

    return { success: true, message: "로그인에 성공했습니다." };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "인증이 실패했습니다. 다시 시도해주세요.",
    };
  }
}

export async function signupAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { success: false, message: "이메일이나 비밀번호가 누락되었습니다." };
  }

  if (password.length < 8) {
    return { success: false, message: "비밀번호는 8자 이상이어야 합니다." };
  }

  try {
    const [existingEmailUser, existingUsernameUser] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { username } }),
    ]);

    if (existingEmailUser) {
      // 만료된 미인증 계정이면 재사용 허용
      if (
        !existingEmailUser.emailVerifiedAt &&
        existingEmailUser.emailVerificationExpiresAt &&
        existingEmailUser.emailVerificationExpiresAt < new Date()
      ) {
        await prisma.user.delete({ where: { id: existingEmailUser.id } });
      } else {
        return { success: false, message: "이미 가입된 이메일입니다." };
      }
    }

    if (existingUsernameUser) {
      if (
        !existingUsernameUser.emailVerifiedAt &&
        existingUsernameUser.emailVerificationExpiresAt &&
        existingUsernameUser.emailVerificationExpiresAt < new Date()
      ) {
        await prisma.user.delete({ where: { id: existingUsernameUser.id } });
      } else {
        return { success: false, message: "이미 사용 중인 닉네임입니다." };
      }
    }

    // 만료된 미인증 계정 일괄 정리 (opportunistic)
    await prisma.user.deleteMany({
      where: {
        emailVerifiedAt: null,
        emailVerificationExpiresAt: { lt: new Date() },
      },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1시간

    const passwordHash = await bcrypt.hash(password, 10);

    // 메일 발송이 성공한 경우에만 계정을 생성한다.
    await sendVerificationEmail(email, token);

    await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: expiresAt,
      },
    });

    return { success: true, message: "인증 메일을 전송했습니다." };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return {
        success: false,
        message: "이미 가입된 이메일이거나 사용 중인 닉네임입니다.",
      };
    }

    console.error("Signup error:", error);
    return {
      success: false,
      message: "회원가입이 실패했습니다. 다시 시도해주세요.",
    };
  }
}

export async function logoutAction(): Promise<AuthActionResult> {
  (await cookies()).set("access_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return { success: true, message: "로그아웃되었습니다." };
}

export async function logoutAndRedirectAction(): Promise<void> {
  await logoutAction();
  redirect("/login");
}
