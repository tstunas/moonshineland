import { forbidden } from "next/navigation";
import type { Metadata } from "next";

import PostsPageClient from "./PostsPageClient";
import { getAdminUserId } from "@/features/admin/access";
import { getPostsPageData, parsePostsQuery } from "@/features/admin/dashboardDetailData";
import type { DashboardSearchParams } from "@/app/(admin)/dashboard/_lib/pageHelpers";

export const metadata: Metadata = {
  title: "문샤인랜드: 관리자 게시글 관리",
};

interface PostsPageProps {
  searchParams: Promise<DashboardSearchParams>;
}

export default async function DashboardPostsPage({ searchParams }: PostsPageProps) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    forbidden();
  }

  const params = await searchParams;
  const initialData = await getPostsPageData(parsePostsQuery(params));

  return <PostsPageClient initialData={initialData} />;
}
