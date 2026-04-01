import type { Metadata } from "next";

import { getCurrentUser } from "@/features/auth/queries";
import { AnnouncementDisclosureList } from "@/features/announcement/components/AnnouncementDisclosureList";
import { getAnnouncementsForPublic } from "@/features/announcement/queries";

export const metadata: Metadata = {
  title: "문샤인랜드: 공지사항",
};

export default async function AnnouncementsPage() {
  const currentUser = await getCurrentUser();
  const announcements = await getAnnouncementsForPublic({
    isAdultVerified: Boolean(currentUser?.isAdultVerified),
    limit: 80,
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <section className="rounded-2xl border border-sky-200 bg-white p-4 sm:p-5">
        <h1 className="text-2xl font-black text-slate-900">공지사항 게시판</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          운영 관련 안내와 업데이트 소식을 확인할 수 있습니다. 제목을 누르면 본문이 펼쳐집니다.
        </p>
      </section>

      <AnnouncementDisclosureList
        announcements={announcements}
        emptyMessage="표시할 공지사항이 없습니다."
      />
    </div>
  );
}
