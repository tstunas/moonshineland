import { verifyAccessToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const token = (await cookies()).get("access_token")?.value;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "인증이 실패했습니다. 다시 로그인해주세요.",
        user: null,
      },
      { status: 401 },
    );
  }

  try {
    const payload = await verifyAccessToken(token);

    return NextResponse.json({
      success: true,
      message: "조회에 성공했습니다.",
      user: {
        id: payload.sub,
        email: payload.email,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "인증이 실패했습니다. 다시 로그인해주세요.",
        user: null,
      },
      { status: 401 },
    );
  }
}
