import { NextRequest, NextResponse } from "next/server";

import { recordAdminAudit } from "@/features/admin/audit";
import { getCurrentUser } from "@/features/auth/queries";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { postId } = await req.json();

    if (!postId || typeof postId !== "number" || postId <= 0) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    }

    const target = await prisma.post.findUnique({
      where: { id: postId },
      select: { isHidden: true },
    });

    if (!target) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { isHidden: !target.isHidden },
      select: {
        id: true,
        isHidden: true,
      },
    });

    await recordAdminAudit({
      adminUserId: Number(currentUser.id),
      action: "posts-hidden",
      targetType: "post",
      targetIds: [postId],
      summary: `레스 1개의 공개 상태를 ${updated.isHidden ? "숨김" : "공개"}으로 변경했습니다.`,
      details: { mode: "single", previous: target.isHidden },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("togglePostHidden error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
