"use server";

import { signAccessToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import { getCurrentUser } from "@/features/auth/queries";
import { getSuspensionMessage, isSuspended } from "@/features/auth/suspension";

export interface AuthActionResult {
  success: boolean;
  message: string;
}

const PASSWORD_RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TOKEN_EXPIRES_MS = 60 * 60 * 1000;

async function issuePasswordResetEmailForUser(
  userId: number,
  email: string,
): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRES_MS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    },
  });

  await sendPasswordResetEmail(email, token);
}

async function issueVerificationEmailForUser(
  userId: number,
  email: string,
): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_EXPIRES_MS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: expiresAt,
    },
  });

  await sendVerificationEmail(email, token);
}

const ACCESS_TOKEN_COOKIE = {
  name: "access_token",
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
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

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return {
        success: false,
        message: "가입한 아이디가 아니거나 비밀번호가 일치하지 않습니다.",
      };
    }

    if (!user.isActive) {
      return {
        success: false,
        message: "탈퇴 처리된 계정입니다. 로그인할 수 없습니다.",
      };
    }

    if (isSuspended(user.suspendedUntil)) {
      return {
        success: false,
        message: getSuspensionMessage(user.suspendedUntil),
      };
    }

    if (user.passwordResetRequired) {
      try {
        await issuePasswordResetEmailForUser(user.id, user.email);
        return {
          success: false,
          message:
            "이 계정은 비밀번호 재설정 후에 로그인할 수 있습니다. 방금 재설정 메일을 보냈습니다. 메일함을 확인해주세요.",
        };
      } catch (error) {
        console.error("Auto password reset email error:", error);
        return {
          success: false,
          message:
            "이 계정은 비밀번호 재설정 후에 로그인할 수 있습니다. 자동 메일 발송에 실패했습니다. 비밀번호 재설정 링크를 이용해주세요.",
        };
      }
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

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    (await cookies()).set(
      ACCESS_TOKEN_COOKIE.name,
      accessToken,
      ACCESS_TOKEN_COOKIE.options,
    );

    revalidatePath("/", "layout");

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
      if (existingEmailUser.emailVerifiedAt) {
        return { success: false, message: "이미 가입된 이메일입니다." };
      }

      await issueVerificationEmailForUser(existingEmailUser.id, existingEmailUser.email);

      return {
        success: true,
        message: "이미 가입된 미인증 계정입니다. 인증 메일을 다시 전송했습니다.",
      };
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

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_EXPIRES_MS);

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

export async function requestPasswordResetAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { success: false, message: "이메일을 입력해주세요." };
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.emailVerifiedAt) {
      return {
        success: true,
        message:
          "입력한 이메일로 계정이 존재하면 비밀번호 재설정 링크를 발송했습니다.",
      };
    }

    await issuePasswordResetEmailForUser(user.id, user.email);

    return {
      success: true,
      message:
        "입력한 이메일로 계정이 존재하면 비밀번호 재설정 링크를 발송했습니다.",
    };
  } catch (error) {
    console.error("Request password reset error:", error);
    return {
      success: false,
      message: "비밀번호 재설정 메일 발송에 실패했습니다. 다시 시도해주세요.",
    };
  }
}

export async function resetPasswordWithTokenAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const token = String(formData.get("token") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token || !newPassword || !confirmPassword) {
    return { success: false, message: "필수 값이 누락되었습니다." };
  }

  if (newPassword.length < 8) {
    return { success: false, message: "비밀번호는 8자 이상이어야 합니다." };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, message: "새 비밀번호 확인이 일치하지 않습니다." };
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gte: new Date() },
      },
    });

    if (!user) {
      return {
        success: false,
        message: "비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.",
      };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetRequired: false,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return {
      success: true,
      message: "비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.",
    };
  } catch (error) {
    console.error("Reset password error:", error);
    return {
      success: false,
      message: "비밀번호 재설정에 실패했습니다. 다시 시도해주세요.",
    };
  }
}

export async function updateMyProfileAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { success: false, message: "로그인이 필요합니다." };
  }

  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();

  if (username.length < 2) {
    return { success: false, message: "닉네임은 2자 이상이어야 합니다." };
  }

  if (username.length > 50) {
    return { success: false, message: "닉네임은 50자를 초과할 수 없습니다." };
  }

  if (avatarUrl.length > 512) {
    return { success: false, message: "아바타 URL 길이가 너무 깁니다." };
  }

  if (avatarUrl) {
    try {
      new URL(avatarUrl);
    } catch {
      return { success: false, message: "아바타 URL 형식이 올바르지 않습니다." };
    }
  }

  try {
    const duplicate = await prisma.user.findFirst({
      where: {
        username,
        id: { not: Number(currentUser.id) },
      },
    });

    if (duplicate) {
      return { success: false, message: "이미 사용 중인 닉네임입니다." };
    }

    await prisma.user.update({
      where: { id: Number(currentUser.id) },
      data: {
        username,
        avatarUrl,
      },
    });

    return { success: true, message: "프로필이 업데이트되었습니다." };
  } catch (error) {
    console.error("Update my profile error:", error);
    return {
      success: false,
      message: "프로필 업데이트에 실패했습니다. 다시 시도해주세요.",
    };
  }
}

export async function changeMyPasswordAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { success: false, message: "로그인이 필요합니다." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { success: false, message: "필수 값이 누락되었습니다." };
  }

  if (newPassword.length < 8) {
    return { success: false, message: "비밀번호는 8자 이상이어야 합니다." };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, message: "새 비밀번호 확인이 일치하지 않습니다." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(currentUser.id) },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return { success: false, message: "사용자 정보를 찾을 수 없습니다." };
    }

    const isValidCurrent = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidCurrent) {
      return { success: false, message: "현재 비밀번호가 일치하지 않습니다." };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetRequired: false,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return { success: true, message: "비밀번호가 변경되었습니다." };
  } catch (error) {
    console.error("Change my password error:", error);
    return {
      success: false,
      message: "비밀번호 변경에 실패했습니다. 다시 시도해주세요.",
    };
  }
}

export async function withdrawMyAccountAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { success: false, message: "로그인이 필요합니다." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const confirmText = String(formData.get("confirmText") ?? "").trim();

  if (!currentPassword) {
    return { success: false, message: "현재 비밀번호를 입력해주세요." };
  }

  if (confirmText !== "탈퇴합니다") {
    return {
      success: false,
      message: '확인 문구로 "탈퇴합니다"를 정확히 입력해주세요.',
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(currentUser.id) },
      select: {
        id: true,
        passwordHash: true,
        isAdmin: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return {
        success: false,
        message: "이미 탈퇴 처리되었거나 사용자 정보를 찾을 수 없습니다.",
      };
    }

    if (user.isAdmin) {
      return {
        success: false,
        message: "관리자 계정은 관리자 화면에서 별도 처리해주세요.",
      };
    }

    const isValidCurrent = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidCurrent) {
      return { success: false, message: "현재 비밀번호가 일치하지 않습니다." };
    }

    const uniqueSuffix = crypto.randomBytes(4).toString("hex");
    const deletedUsername = `deleted-user-${user.id}-${uniqueSuffix}`;
    const deletedEmail = `deleted+${user.id}.${Date.now()}.${uniqueSuffix}@withdrawn.local`;
    const deletedPasswordHash = await bcrypt.hash(crypto.randomUUID(), 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        username: deletedUsername,
        email: deletedEmail,
        avatarUrl: "",
        passwordHash: deletedPasswordHash,
        passwordResetRequired: false,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        suspendedUntil: null,
        isForeigner: false,
        isAdultVerified: false,
        isActive: false,
        isAdmin: false,
        emailVerifiedAt: null,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
        preferences: {},
      },
    });

    await logoutAction();

    return { success: true, message: "회원 탈퇴가 완료되었습니다." };
  } catch (error) {
    console.error("Withdraw my account error:", error);
    return {
      success: false,
      message: "회원 탈퇴 처리에 실패했습니다. 다시 시도해주세요.",
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

  revalidatePath("/", "layout");

  return { success: true, message: "로그아웃되었습니다." };
}

export async function logoutAndRedirectAction(): Promise<void> {
  await logoutAction();
  redirect("/login");
}
