"use client";

import { useState } from "react";
import { Search, Filter, Edit, Folder } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// カテゴリ（8つ固定）
const categories = [
  "全体の健康診断",
  "料金変動の時に使うもの",
  "その他",
  "コッシー",
  "玉城",
  "大城",
  "神里",
  "ヒラリー",
];

// ツールカードのプレースホルダー
function ToolCard({ name, category, type }: { name: string; category: string; type: string }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Folder className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">{name}</CardTitle>
              <p className="text-sm text-muted-foreground">{category}</p>
            </div>
          </div>
          <Badge variant="outline">{type}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          ツールの説明がここに表示されます
        </p>
      </CardContent>
    </Card>
  );
}

export default function ToolsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ツール</h1>
        <Button
          variant={editMode ? "default" : "outline"}
          onClick={() => setEditMode(!editMode)}
        >
          <Edit className="w-4 h-4 mr-2" />
          {editMode ? "編集完了" : "編集"}
        </Button>
      </div>

      {/* フィルタ枠 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="ツールを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              フィルタ
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="secondary">すべて</Badge>
            <Badge variant="outline">Web</Badge>
            <Badge variant="outline">Excel</Badge>
            <Badge variant="outline">BI</Badge>
            <Badge variant="outline">Python</Badge>
            <Badge variant="outline">EXE</Badge>
            <Badge variant="outline">PAD</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 編集モードの説明 */}
      {editMode && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <p className="text-sm text-blue-800">
              編集モード: ドラッグ＆ドロップでツールの順序を変更できます（未実装）
            </p>
          </CardContent>
        </Card>
      )}

      {/* カテゴリ別ツール一覧 */}
      <div className="space-y-8">
        {categories.map((category) => (
          <section key={category}>
            <h2 className="text-lg font-semibold mb-4 pb-2 border-b">
              {category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ToolCard name="サンプルツール" category={category} type="Web" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
