import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

export default function RunsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <History className="w-6 h-6" />
        <h1 className="text-2xl font-bold">実行履歴</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近の実行</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* テーブルヘッダー */}
            <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
              <div>ツール名</div>
              <div>実行者</div>
              <div>開始時刻</div>
              <div>終了時刻</div>
              <div>ステータス</div>
            </div>

            {/* サンプル行 */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-5 gap-4 text-sm py-2 border-b last:border-0">
                <div className="font-medium">サンプルツール {i}</div>
                <div className="text-muted-foreground">user@example.com</div>
                <div className="text-muted-foreground">2024-01-01 12:00</div>
                <div className="text-muted-foreground">2024-01-01 12:05</div>
                <div>
                  <Badge variant="outline" className={i === 2 ? "text-red-600" : "text-green-600"}>
                    {i === 2 ? "失敗" : "成功"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            実行履歴がここに表示されます
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
