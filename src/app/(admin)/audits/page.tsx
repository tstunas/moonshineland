import { forbidden } from "next/navigation";
import type { Metadata } from "next";

import AuditsPageClient from "./AuditsPageClient";
import { getAdminUserId } from "@/features/admin/access";
import { getAuditsPageData, parseAuditsQuery } from "@/features/admin/auditPageData";
import type { DashboardSearchParams } from "@/app/(admin)/dashboard/_lib/pageHelpers";

export const metadata: Metadata = {
  title: "문샤인랜드: 감사 로그",
};

interface AuditPageProps {
  searchParams: Promise<DashboardSearchParams>;
}

export default async function DashboardAuditsPage({ searchParams }: AuditPageProps) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    forbidden();
  }

  const params = await searchParams;
  const initialData = await getAuditsPageData(parseAuditsQuery(params));

  return <AuditsPageClient initialData={initialData} />;
}
