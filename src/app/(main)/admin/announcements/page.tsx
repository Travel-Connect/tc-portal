import { Bell } from "lucide-react";
import { getAllAnnouncements } from "@/lib/queries/announcements";
import { AnnouncementAdmin } from "./AnnouncementAdmin";

export default async function AnnouncementsAdminPage() {
  const announcements = await getAllAnnouncements();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-6 h-6" />
        <h1 className="text-2xl font-bold">お知らせ管理</h1>
      </div>

      <AnnouncementAdmin initialAnnouncements={announcements} />
    </div>
  );
}
