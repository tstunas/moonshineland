import { forbidden } from "next/navigation";
import type { Metadata } from "next";

import AdminAnnouncementsPageClient from "./AdminAnnouncementsPageClient";
import { getAdminUserId } from "@/features/admin/access";
import { getAnnouncementsForAdmin } from "@/features/announcement/queries";

export const metadata: Metadata = {
  title: "문샤인랜드: 공지사항 관리",
};

export default async function DashboardAnnouncementsPage() {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    forbidden();
  }

  const announcements = await getAnnouncementsForAdmin({ limit: 150 });

  return <AdminAnnouncementsPageClient initialAnnouncements={announcements} />;
}
