import { getLatestAnnouncementForPublic } from "@/features/announcement/queries";
import { AnnouncementDisclosureList } from "@/features/announcement/components/AnnouncementDisclosureList";

interface LatestBoardAnnouncementProps {
  isAdultVerified: boolean;
}

export async function LatestBoardAnnouncement({
  isAdultVerified,
}: LatestBoardAnnouncementProps) {
  const latest = await getLatestAnnouncementForPublic({
    isAdultVerified,
  });

  if (!latest) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-sky-900 sm:text-base">최신 공지사항</h2>
        <a
          href="/announcements"
          className="text-xs font-semibold text-sky-700 hover:text-sky-800 hover:underline"
        >
          전체 보기
        </a>
      </div>
      <AnnouncementDisclosureList announcements={[latest]} compact />
    </section>
  );
}
