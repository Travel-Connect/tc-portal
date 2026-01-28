import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPublishedAnnouncements, getDismissedAnnouncementIds } from "@/lib/queries/announcements";
import { AnnouncementList } from "@/components/announcements";

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [announcements, dismissedIds] = await Promise.all([
    getPublishedAnnouncements(),
    user ? getDismissedAnnouncementIds(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-6 h-6" />
        <h1 className="text-2xl font-bold">お知らせ</h1>
      </div>

      <AnnouncementList
        announcements={announcements}
        dismissedIds={dismissedIds}
      />
    </div>
  );
}
