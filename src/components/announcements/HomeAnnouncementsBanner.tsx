import { Bell } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUndismissedAnnouncements } from "@/lib/queries/announcements";
import { HomeAnnouncementsBannerClient } from "./HomeAnnouncementsBannerClient";

export async function HomeAnnouncementsBanner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const announcements = await getUndismissedAnnouncements(user.id, 3);

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-yellow-700">
          <Bell className="w-4 h-4" />
          <span className="text-sm font-medium">お知らせ</span>
        </div>
        <Link
          href="/announcements"
          className="text-xs text-muted-foreground hover:underline"
        >
          すべてのお知らせ →
        </Link>
      </div>
      <HomeAnnouncementsBannerClient announcements={announcements} />
    </div>
  );
}
