import { signAccessToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "이메일이나 비밀번호가 누락되었습니다." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "가입한 아이디가 아니거나 비밀번호가 일치하지 않습니다.",
        },
        { status: 401 },
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          message: "가입한 아이디가 아니거나 비밀번호가 일치하지 않습니다.",
        },
        { status: 401 },
      );
    }

    const accessToken = await signAccessToken({
      sub: String(user.id),
      email: user.email,
    });

    const res = NextResponse.json({
      success: true,
      message: "로그인에 성공했습니다.",
    });

    res.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "인증이 실패했습니다. 다시 시도해주세요." },
      { status: 401 },
    );
  }
}
