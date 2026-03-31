import { NextRequest, NextResponse } from "next/server";

import { recordAdminAudit } from "@/features/admin/audit";
import { getAdminUserId } from "@/features/admin/access";
import { getUsersPageData, parseUsersQuery } from "@/features/admin/dashboardDetailData";
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

  const data = await getUsersPageData(parseUsersQuery(request.nextUrl.searchParams));
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await request.json()) as {
    action?: string;
    ids?: unknown;
    value?: string;
  };

  const ids = parseIds(body.ids);
  if (ids.length === 0) {
    return NextResponse.json({ error: "선택된 유저가 없습니다." }, { status: 400 });
  }

  if (body.action === "active") {
    if (body.value === "active" || body.value === "inactive") {
      const isActive = body.value === "active";
      const result = await prisma.user.updateMany({
        where: { id: { in: ids } },
        data: { isActive },
      });

      const summary = `${result.count}명 유저를 ${isActive ? "활성화" : "비활성화"}했습니다.`;
      await recordAdminAudit({
        adminUserId,
        action: "users-active",
        targetType: "user",
        targetIds: ids,
        summary,
        details: { mode: "bulk", forceState: body.value },
      });

      return NextResponse.json({ summary });
    }

    if (ids.length !== 1) {
      return NextResponse.json({ error: "단건 토글만 가능합니다." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: ids[0] },
      select: { isActive: true },
    });

    if (!target) {
      return NextResponse.json({ error: "대상을 찾지 못했습니다." }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: ids[0] },
      data: { isActive: !target.isActive },
    });

    const summary = `유저 1명의 상태를 ${target.isActive ? "비활성" : "활성"}으로 변경했습니다.`;
    await recordAdminAudit({
      adminUserId,
      action: "users-active",
      targetType: "user",
      targetIds: ids,
      summary,
      details: { mode: "single", previous: target.isActive },
    });

    return NextResponse.json({ summary });
  }

  if (body.action === "admin") {
    if (body.value === "admin" || body.value === "user") {
      const safeIds = body.value === "user" ? ids.filter((id) => id !== adminUserId) : ids;
      if (safeIds.length === 0) {
        return NextResponse.json(
          { error: "자기 자신의 관리자 권한은 해제할 수 없습니다." },
          { status: 400 },
        );
      }

      const isAdmin = body.value === "admin";
      const result = await prisma.user.updateMany({
        where: { id: { in: safeIds } },
        data: { isAdmin },
      });

      const summary = `${result.count}명 유저의 관리자 권한을 ${isAdmin ? "지정" : "해제"}했습니다.`;
      await recordAdminAudit({
        adminUserId,
        action: "users-admin",
        targetType: "user",
        targetIds: safeIds,
        summary,
        details: { mode: "bulk", forceRole: body.value },
      });

      return NextResponse.json({ summary });
    }

    if (ids.length !== 1) {
      return NextResponse.json({ error: "단건 토글만 가능합니다." }, { status: 400 });
    }

    if (ids[0] === adminUserId) {
      return NextResponse.json(
        { error: "자기 자신의 관리자 권한은 해제할 수 없습니다." },
        { status: 400 },
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: ids[0] },
      select: { isAdmin: true },
    });

    if (!target) {
      return NextResponse.json({ error: "대상을 찾지 못했습니다." }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: ids[0] },
      data: { isAdmin: !target.isAdmin },
    });

    const summary = `유저 1명의 관리자 권한을 ${target.isAdmin ? "해제" : "지정"}했습니다.`;
    await recordAdminAudit({
      adminUserId,
      action: "users-admin",
      targetType: "user",
      targetIds: ids,
      summary,
      details: { mode: "single", previous: target.isAdmin },
    });

    return NextResponse.json({ summary });
  }

  return NextResponse.json({ error: "지원하지 않는 작업입니다." }, { status: 400 });
}