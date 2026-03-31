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

    const currentAdminId = Number(currentUser.id);

    const { userId } = await req.json();

    if (!userId || typeof userId !== "number" || userId <= 0) {
      return NextResponse.json(
        { error: "Invalid userId" },
        { status: 400 }
      );
    }

    if (userId === currentAdminId) {
      return NextResponse.json(
        { error: "Cannot change your own admin status" },
        { status: 403 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!target) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isAdmin: !target.isAdmin },
      select: {
        id: true,
        isAdmin: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("toggleUserAdmin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
