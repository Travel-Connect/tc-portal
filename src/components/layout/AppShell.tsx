import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  isAdmin?: boolean;
  failedTaskCount?: number;
}

export function AppShell({ children, userEmail, isAdmin, failedTaskCount }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isAdmin={isAdmin} failedTaskCount={failedTaskCount} />
      <div className="flex-1 flex flex-col">
        <Header userEmail={userEmail} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
