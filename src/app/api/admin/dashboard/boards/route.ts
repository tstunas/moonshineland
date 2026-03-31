import { NextRequest, NextResponse } from "next/server";

import { recordAdminAudit } from "@/features/admin/audit";
import { getAdminUserId } from "@/features/admin/access";
import { getBoardsPageData, parseBoardsQuery } from "@/features/admin/dashboardDetailData";
import prisma from "@/lib/prisma";

function parseIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter((item): item is number => Number.isInteger(item) && item > 0),
    ),
  );
}

export async function GET(request: NextRequest) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const data = await getBoardsPageData(parseBoardsQuery(request.nextUrl.searchParams));
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await request.json()) as { ids?: unknown; value?: string };
  const ids = parseIds(body.ids);
  if (ids.length === 0) {
    return NextResponse.json({ error: "선택된 게시판이 없습니다." }, { status: 400 });
  }

  if (body.value === "visible" || body.value === "hidden") {
    const isHidden = body.value === "hidden";
    const result = await prisma.board.updateMany({
      where: { id: { in: ids } },
      data: { isHidden },
    });

    const summary = `${result.count}개 게시판을 ${isHidden ? "숨김" : "공개"} 처리했습니다.`;
    await recordAdminAudit({
      adminUserId,
      action: "boards-hidden",
      targetType: "board",
      targetIds: ids,
      summary,
      details: { mode: "bulk", forceVisibility: body.value },
    });

    return NextResponse.json({ summary });
  }

  if (ids.length !== 1) {
    return NextResponse.json({ error: "단건 토글만 가능합니다." }, { status: 400 });
  }

  const target = await prisma.board.findUnique({
    where: { id: ids[0] },
    select: { isHidden: true },
  });

  if (!target) {
    return NextResponse.json({ error: "대상을 찾지 못했습니다." }, { status: 404 });
  }

  await prisma.board.update({
    where: { id: ids[0] },
    data: { isHidden: !target.isHidden },
  });

  const summary = `게시판 1개의 공개 상태를 ${target.isHidden ? "공개" : "숨김"}으로 변경했습니다.`;
  await recordAdminAudit({
    adminUserId,
    action: "boards-hidden",
    targetType: "board",
    targetIds: ids,
    summary,
    details: { mode: "single", previous: target.isHidden },
  });

  return NextResponse.json({ summary });
}