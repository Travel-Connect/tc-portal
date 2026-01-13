import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const adminEmails = process.env.TC_PORTAL_ADMIN_EMAILS?.split(",") || [];
  const isAdmin = adminEmails.includes(user?.email || "");

  return (
    <AppShell userEmail={user?.email} isAdmin={isAdmin}>
      {children}
    </AppShell>
  );
}
