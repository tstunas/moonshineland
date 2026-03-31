import { NextRequest, NextResponse } from "next/server";

import { getAdminUserId } from "@/features/admin/access";
import { getAuditsPageData, parseAuditsQuery } from "@/features/admin/auditPageData";

export async function GET(request: NextRequest) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const data = await getAuditsPageData(parseAuditsQuery(request.nextUrl.searchParams));
  return NextResponse.json(data);
}