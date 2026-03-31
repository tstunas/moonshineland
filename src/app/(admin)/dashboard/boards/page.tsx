import { forbidden } from "next/navigation";
import type { Metadata } from "next";

import BoardsPageClient from "./BoardsPageClient";
import { getAdminUserId } from "@/features/admin/access";
import { getBoardsPageData, parseBoardsQuery } from "@/features/admin/dashboardDetailData";
import type { DashboardSearchParams } from "@/app/(admin)/dashboard/_lib/pageHelpers";

export const metadata: Metadata = {
  title: "문샤인랜드: 관리자 게시판 관리",
};

interface BoardsPageProps {
  searchParams: Promise<DashboardSearchParams>;
}

export default async function DashboardBoardsPage({ searchParams }: BoardsPageProps) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    forbidden();
  }

  const params = await searchParams;
  const initialData = await getBoardsPageData(parseBoardsQuery(params));

  return <BoardsPageClient initialData={initialData} />;
}
