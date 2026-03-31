import { forbidden } from "next/navigation";
import type { Metadata } from "next";

import ThreadsPageClient from "./ThreadsPageClient";
import { getAdminUserId } from "@/features/admin/access";
import { getThreadsPageData, parseThreadsQuery } from "@/features/admin/dashboardDetailData";
import type { DashboardSearchParams } from "@/app/(admin)/dashboard/_lib/pageHelpers";

export const metadata: Metadata = {
  title: "문샤인랜드: 관리자 스레드 관리",
};

interface ThreadsPageProps {
  searchParams: Promise<DashboardSearchParams>;
}

export default async function DashboardThreadsPage({ searchParams }: ThreadsPageProps) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    forbidden();
  }

  const params = await searchParams;
  const initialData = await getThreadsPageData(parseThreadsQuery(params));

  return <ThreadsPageClient initialData={initialData} />;
}
