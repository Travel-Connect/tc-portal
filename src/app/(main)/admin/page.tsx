import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Wrench, FolderTree, Users, Bell, AlertTriangle, Monitor } from "lucide-react";
import Link from "next/link";

const adminSections = [
  {
    title: "ツール管理",
    description: "ツールの追加・編集・アーカイブ",
    icon: Wrench,
    href: "/admin/tools",
    implemented: true,
  },
  {
    title: "カテゴリ管理",
    description: "カテゴリの追加・編集・順序変更",
    icon: FolderTree,
    href: "/admin/categories",
    implemented: true,
  },
  {
    title: "監視管理",
    description: "BAT/Pythonタスク監視の登録・編集",
    icon: Monitor,
    href: "/admin/monitors",
    implemented: true,
  },
  {
    title: "ユーザー管理",
    description: "ユーザー権限の管理",
    icon: Users,
    href: "/admin/users",
    implemented: false,
  },
  {
    title: "お知らせ管理",
    description: "お知らせの作成・編集",
    icon: Bell,
    href: "/admin/announcements",
    implemented: true,
  },
  {
    title: "障害管理",
    description: "障害情報の作成・更新",
    icon: AlertTriangle,
    href: "/admin/incidents",
    implemented: false,
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6" />
        <h1 className="text-2xl font-bold">管理</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminSections.map((section) => {
          const cardClass = section.implemented
            ? "hover:shadow-md transition-shadow"
            : "hover:shadow-md transition-shadow opacity-60";
          return (
            <Card key={section.href} className={cardClass}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {section.implemented ? (
                  <Link href={section.href}>
                    <Button variant="outline" className="w-full">
                      管理画面へ
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    準備中
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
