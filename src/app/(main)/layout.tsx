import { AppShell } from "@/components/layout";
import { getCachedUser } from "@/lib/auth/get-current-user";
import { isAdminByUser } from "@/lib/queries/admin";
import { getFailedTaskCount } from "@/lib/actions/task-monitor";
import { getUnreadCountByUserId } from "@/lib/actions/chat";
import { getUndismissedAnnouncementCount } from "@/lib/queries/announcements";
import { createPerfContext, measure, logPerfSummary } from "@/lib/perf/measure";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = createPerfContext();

  // 1) auth.getUser() — cache() によりリクエスト内で1回だけ実行
  const user = await measure("layout.getCachedUser", () => getCachedUser(), ctx);

  // 2) user 依存の4クエリを並列実行（直列 → Promise.all）
  const [isAdmin, failedTaskCount, unreadMessageCount, undismissedAnnouncementCount] = await measure(
    "layout.parallelQueries",
    () => Promise.all([
      user ? isAdminByUser(user) : Promise.resolve(false),
      getFailedTaskCount(),
      user ? getUnreadCountByUserId(user.id) : Promise.resolve(0),
      user ? getUndismissedAnnouncementCount(user.id) : Promise.resolve(0),
    ]),
    ctx,
  );

  logPerfSummary(ctx);

  return (
    <AppShell userEmail={user?.email} isAdmin={isAdmin} failedTaskCount={failedTaskCount} unreadMessageCount={unreadMessageCount} undismissedAnnouncementCount={undismissedAnnouncementCount}>
      {children}
    </AppShell>
  );
}
