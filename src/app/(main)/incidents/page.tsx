import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export default function IncidentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-6 h-6" />
        <h1 className="text-2xl font-bold">障害情報</h1>
      </div>

      <div className="space-y-4">
        {/* サンプル障害 */}
        {[
          { title: "サーバー接続エラー", status: "resolved", date: "2024-01-14" },
          { title: "データ同期の遅延", status: "monitoring", date: "2024-01-13" },
          { title: "ログイン障害", status: "investigating", date: "2024-01-12" },
        ].map((incident, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{incident.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      incident.status === "resolved"
                        ? "outline"
                        : incident.status === "monitoring"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {incident.status === "resolved"
                      ? "解決済み"
                      : incident.status === "monitoring"
                      ? "監視中"
                      : "調査中"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{incident.date}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                障害の詳細がここに表示されます。影響を受けるツール: ツールA, ツールB
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        障害情報一覧がここに表示されます
      </p>
    </div>
  );
}
