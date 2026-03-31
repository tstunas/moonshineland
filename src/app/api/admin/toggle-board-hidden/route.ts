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

    const { boardId } = await req.json();

    if (!boardId || typeof boardId !== "number" || boardId <= 0) {
      return NextResponse.json(
        { error: "Invalid boardId" },
        { status: 400 }
      );
    }

    const target = await prisma.board.findUnique({
      where: { id: boardId },
      select: { isHidden: true },
    });

    if (!target) {
      return NextResponse.json(
        { error: "Board not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.board.update({
      where: { id: boardId },
      data: { isHidden: !target.isHidden },
      select: {
        id: true,
        isHidden: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("toggleBoardHidden error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
