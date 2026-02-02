import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout";
import { isCurrentUserAdmin } from "@/lib/queries/admin";
import { getFailedTaskCount } from "@/lib/actions/task-monitor";
import { getUnreadCount } from "@/lib/actions/chat";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = await isCurrentUserAdmin();
  const failedTaskCount = await getFailedTaskCount();
  const unreadMessageCount = await getUnreadCount();

  return (
    <AppShell userEmail={user?.email} isAdmin={isAdmin} failedTaskCount={failedTaskCount} unreadMessageCount={unreadMessageCount}>
      {children}
    </AppShell>
  );
}
