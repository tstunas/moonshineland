import { forbidden } from "next/navigation";
import type { Metadata } from "next";

import UsersPageClient from "./UsersPageClient";
import { getAdminUserId } from "@/features/admin/access";
import { getUsersPageData, parseUsersQuery } from "@/features/admin/dashboardDetailData";
import type { DashboardSearchParams } from "@/app/(admin)/dashboard/_lib/pageHelpers";

export const metadata: Metadata = {
  title: "문샤인랜드: 관리자 사용자 관리",
};

interface UsersPageProps {
  searchParams: Promise<DashboardSearchParams>;
}

export default async function DashboardUsersPage({ searchParams }: UsersPageProps) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    forbidden();
  }

  const params = await searchParams;
  const initialData = await getUsersPageData(parseUsersQuery(params));

  return <UsersPageClient initialData={initialData} currentAdminId={adminUserId} />;
}
