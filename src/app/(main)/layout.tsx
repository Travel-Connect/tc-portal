import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout";
import { isCurrentUserAdmin } from "@/lib/queries/admin";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = await isCurrentUserAdmin();

  return (
    <AppShell userEmail={user?.email} isAdmin={isAdmin}>
      {children}
    </AppShell>
  );
}
