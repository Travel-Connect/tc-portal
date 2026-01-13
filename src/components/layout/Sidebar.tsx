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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "ホーム", icon: <Home className="w-5 h-5" /> },
  { href: "/tools", label: "ツール", icon: <Wrench className="w-5 h-5" /> },
  { href: "/runs", label: "実行履歴", icon: <History className="w-5 h-5" /> },
  { href: "/announcements", label: "お知らせ", icon: <Bell className="w-5 h-5" /> },
  { href: "/incidents", label: "障害", icon: <AlertTriangle className="w-5 h-5" /> },
  { href: "/admin", label: "管理", icon: <Settings className="w-5 h-5" />, adminOnly: true },
];

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin = false }: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

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
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
