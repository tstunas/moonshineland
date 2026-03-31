import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/features/auth/queries";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { userId } = await req.json();

    if (!userId || typeof userId !== "number" || userId <= 0) {
      return NextResponse.json(
        { error: "Invalid userId" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });

    if (!target) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !target.isActive },
      select: {
        id: true,
        isActive: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("toggleUserActive error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
