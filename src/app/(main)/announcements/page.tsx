import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

export default function AnnouncementsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-6 h-6" />
        <h1 className="text-2xl font-bold">お知らせ</h1>
      </div>

      <div className="space-y-4">
        {/* サンプルお知らせ */}
        {[
          { title: "システムメンテナンスのお知らせ", date: "2024-01-15", important: true },
          { title: "新機能リリースのお知らせ", date: "2024-01-10", important: false },
          { title: "利用規約の更新について", date: "2024-01-05", important: false },
        ].map((announcement, i) => (
          <Card key={i} className={announcement.important ? "border-yellow-300 bg-yellow-50" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {announcement.important && (
                    <Badge variant="destructive" className="text-xs">重要</Badge>
                  )}
                  {announcement.title}
                </CardTitle>
                <span className="text-sm text-muted-foreground">{announcement.date}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                お知らせの内容がここに表示されます。
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        お知らせ一覧がここに表示されます
      </p>
    </div>
  );
}
