import type { NextRequest } from "next/server";

import { runAutoPostSchedulerTick } from "@/services/autoPostScheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasCronPermission(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return true;
  }

  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  const querySecret = request.nextUrl.searchParams.get("secret")?.trim();

  return headerSecret === secret || querySecret === secret;
}

export async function POST(request: NextRequest) {
  if (!hasCronPermission(request)) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(limitParam)
    ? Math.max(1, Math.min(500, Math.trunc(limitParam)))
    : 100;

  const result = await runAutoPostSchedulerTick(limit);
  return Response.json({
    ok: true,
    ...result,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
