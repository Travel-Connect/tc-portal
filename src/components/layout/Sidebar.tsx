"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Wrench,
  History,
  Bell,
  AlertTriangle,
  Settings,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  badgeKey?: string;
}

const navItems: NavItem[] = [
  { href: "/", label: "ホーム", icon: <Home className="w-5 h-5" /> },
  { href: "/tools", label: "ツール", icon: <Wrench className="w-5 h-5" /> },
  { href: "/messages", label: "メッセージ", icon: <MessageSquare className="w-5 h-5" />, badgeKey: "unreadMessages" },
  { href: "/runs", label: "実行履歴", icon: <History className="w-5 h-5" /> },
  { href: "/announcements", label: "お知らせ", icon: <Bell className="w-5 h-5" /> },
  { href: "/incidents", label: "障害", icon: <AlertTriangle className="w-5 h-5" />, badgeKey: "jobError" },
  { href: "/admin", label: "管理", icon: <Settings className="w-5 h-5" /> },
];

interface SidebarProps {
  isAdmin?: boolean;
  failedTaskCount?: number;
  unreadMessageCount?: number;
}

export function Sidebar({ isAdmin = false, failedTaskCount = 0, unreadMessageCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const getBadgeCount = (badgeKey?: string): number => {
    if (badgeKey === "jobError") return failedTaskCount;
    if (badgeKey === "unreadMessages") return unreadMessageCount;
    return 0;
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-xl font-bold text-sidebar-foreground">
          ツールポータル
        </h1>
      </div>
      <nav className="px-3">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const badgeCount = getBadgeCount(item.badgeKey);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.badgeKey && (
                    badgeCount > 0 ? (
                      <span className="flex items-center gap-1.5">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                        </span>
                        <span className="px-1.5 py-0.5 text-xs font-semibold bg-destructive text-destructive-foreground rounded-full">
                          {badgeCount}
                        </span>
                      </span>
                    ) : (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                      </span>
                    )
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
