import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  isAdmin?: boolean;
}

export function AppShell({ children, userEmail, isAdmin }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex-1 flex flex-col">
        <Header userEmail={userEmail} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
