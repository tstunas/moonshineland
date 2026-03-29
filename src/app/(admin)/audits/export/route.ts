import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { buildAuditWhere } from "@/app/(admin)/audits/_lib/auditFilters";
import { getCurrentUser } from "@/features/auth/queries";
import prisma from "@/lib/prisma";

function toCsvCell(value: unknown): string {
  const raw =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : JSON.stringify(value);

  return `"${raw.replaceAll("\"", "\"\"")}"`;
}

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isAdmin) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const search = request.nextUrl.searchParams;
  const query = search.get("query")?.trim() ?? "";
  const targetType = search.get("targetType")?.trim() || "all";
  const action = search.get("action")?.trim() ?? "";
  const fromDate = search.get("fromDate")?.trim() ?? "";
  const toDate = search.get("toDate")?.trim() ?? "";

  const where = buildAuditWhere({
    query,
    targetType,
    action,
    fromDate,
    toDate,
  });

  const logs = await prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      action: true,
      targetType: true,
      targetIds: true,
      summary: true,
      details: true,
      createdAt: true,
      adminUser: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  const header = [
    "id",
    "createdAt",
    "action",
    "targetType",
    "targetIds",
    "summary",
    "details",
    "adminUserId",
    "adminUsername",
    "adminEmail",
  ];

  const rows = logs.map((log) => [
    log.id,
    log.createdAt.toISOString(),
    log.action,
    log.targetType,
    log.targetIds,
    log.summary,
    log.details,
    log.adminUser.id,
    log.adminUser.username,
    log.adminUser.email,
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => toCsvCell(cell)).join(","))
    .join("\n");

  const fileSuffix = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const filename = `admin-audit-logs-${fileSuffix}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
      "Cache-Control": "no-store",
    },
  });
}
