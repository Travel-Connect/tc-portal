import { Bell } from "lucide-react";
import { getCachedUser } from "@/lib/auth/get-current-user";
import { getPublishedAnnouncements, getDismissedAnnouncementIds } from "@/lib/queries/announcements";
import { AnnouncementList } from "@/components/announcements";
import { createPerfContext, measure, logPerfSummary } from "@/lib/perf/measure";

export default async function AnnouncementsPage() {
  const ctx = createPerfContext();

  const user = await measure("announcements.getCachedUser", () => getCachedUser(), ctx);

  const [announcements, dismissedIds] = await measure("announcements.parallelQueries", () => Promise.all([
    getPublishedAnnouncements(),
    user ? getDismissedAnnouncementIds(user.id) : Promise.resolve([]),
  ]), ctx);

  logPerfSummary(ctx);

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
