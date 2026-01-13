import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Wrench, FolderTree, Users, Bell, AlertTriangle } from "lucide-react";
import Link from "next/link";

const adminSections = [
  {
    title: "ツール管理",
    description: "ツールの追加・編集・削除",
    icon: Wrench,
    href: "/admin/tools",
  },
  {
    title: "カテゴリ管理",
    description: "カテゴリの追加・編集・順序変更",
    icon: FolderTree,
    href: "/admin/categories",
  },
  {
    title: "ユーザー管理",
    description: "ユーザー権限の管理",
    icon: Users,
    href: "/admin/users",
  },
  {
    title: "お知らせ管理",
    description: "お知らせの作成・編集",
    icon: Bell,
    href: "/admin/announcements",
  },
  {
    title: "障害管理",
    description: "障害情報の作成・更新",
    icon: AlertTriangle,
    href: "/admin/incidents",
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
        {adminSections.map((section) => (
          <Card key={section.href} className="hover:shadow-md transition-shadow">
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
              <Link href={section.href}>
                <Button variant="outline" className="w-full">
                  管理画面へ
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            各管理機能は今後実装されます。現在はUI枠のみです。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
