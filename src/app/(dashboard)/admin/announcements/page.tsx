import { getAnnouncements } from "@/app/(dashboard)/admin/actions";
import { AnnouncementsClient } from "@/components/admin/announcements-client";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

export default async function AdminAnnouncementsPage() {
  const announcements = await getAnnouncements();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>Announcements</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Broadcast messages shown as dismissible banners on the dashboard.
        </p>
      </div>
      <AnnouncementsClient announcements={announcements} />
    </div>
  );
}
