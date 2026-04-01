import { NextRequest, NextResponse } from "next/server";

import { recordAdminAudit } from "@/features/admin/audit";
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

    await recordAdminAudit({
      adminUserId: currentUser.id,
      action: "threads-hidden",
      targetType: "thread",
      targetIds: [threadId],
      summary: `스레드 1개의 공개 상태를 ${updated.isHidden ? "숨김" : "공개"}으로 변경했습니다.`,
      details: { mode: "single", previous: target.isHidden },
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
