import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Star, Pin } from "lucide-react";
import Link from "next/link";

interface ToolDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ToolDetailPage({ params }: ToolDetailPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/tools">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
        </Link>
      </div>

      {/* ツール情報 */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">ツール名 (ID: {id})</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">Web</Badge>
              <Badge variant="secondary">全体の健康診断</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Pin className="w-4 h-4 mr-2" />
            ピン留め
          </Button>
          <Button variant="outline" size="sm">
            <Star className="w-4 h-4 mr-2" />
            お気に入り
          </Button>
          <Button size="sm">
            <Play className="w-4 h-4 mr-2" />
            実行
          </Button>
        </div>
      </div>

      {/* タブ（枠のみ） */}
      <div className="border-b">
        <div className="flex gap-4">
          {["概要", "実行・起動", "履歴", "手順・FAQ", "更新履歴", "配布"].map(
            (tab, index) => (
              <button
                key={tab}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  index === 0
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>
      </div>

      {/* コンテンツ（枠のみ） */}
      <Card>
        <CardHeader>
          <CardTitle>概要</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            ツールの概要がここに表示されます。
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">最終実行</p>
              <p className="font-medium">2024-01-01 12:00</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ステータス</p>
              <Badge variant="outline" className="text-green-600">成功</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
