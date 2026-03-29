"use server";

import { signAccessToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

    const accessToken = await signAccessToken({
      sub: String(user.id),
      email: user.email,
      isAdultVerified: user.isAdultVerified,
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
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return { success: false, message: "이미 가입된 이메일입니다." };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, email, passwordHash },
    });

    const accessToken = await signAccessToken({
      sub: String(user.id),
      email: user.email,
      isAdultVerified: user.isAdultVerified,
    });

    (await cookies()).set(
      ACCESS_TOKEN_COOKIE.name,
      accessToken,
      ACCESS_TOKEN_COOKIE.options,
    );

    return { success: true, message: "회원가입에 성공했습니다." };
  } catch (error) {
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
