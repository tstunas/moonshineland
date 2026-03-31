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

    const { threadId } = await req.json();

    if (!threadId || typeof threadId !== "number" || threadId <= 0) {
      return NextResponse.json(
        { error: "Invalid threadId" },
        { status: 400 }
      );
    }

    const target = await prisma.thread.findUnique({
      where: { id: threadId },
      select: { isHidden: true },
    });

    if (!target) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.thread.update({
      where: { id: threadId },
      data: { isHidden: !target.isHidden },
      select: {
        id: true,
        isHidden: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("toggleThreadHidden error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
