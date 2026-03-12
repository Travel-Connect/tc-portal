import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SoundButtons } from "@/components/fun/SoundButtons";
import { UnreadCountProvider } from "@/contexts/UnreadCountContext";

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  isAdmin?: boolean;
  failedTaskCount?: number;
  unreadMessageCount?: number;
  undismissedAnnouncementCount?: number;
}

export function AppShell({ children, userEmail, isAdmin, failedTaskCount, unreadMessageCount = 0, undismissedAnnouncementCount = 0 }: AppShellProps) {
  return (
    <UnreadCountProvider initialCount={unreadMessageCount}>
      <div className="flex min-h-screen bg-background">
        <Sidebar isAdmin={isAdmin} failedTaskCount={failedTaskCount} undismissedAnnouncementCount={undismissedAnnouncementCount} />
        <div className="flex-1 flex flex-col">
          <Header userEmail={userEmail} />
          <main className="flex-1 p-6">{children}</main>
        </div>
        <SoundButtons />
      </div>
    </UnreadCountProvider>
  );
}
