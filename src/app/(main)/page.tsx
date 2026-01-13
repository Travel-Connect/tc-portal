import { Bell, Pin, Star, Grid3X3, Folder } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

// プレースホルダータイル
function ToolTile({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-card border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
      <div className="w-10 h-10 flex items-center justify-center text-muted-foreground mb-2">
        {icon}
      </div>
      <span className="text-sm font-medium text-center">{title}</span>
    </div>
  );
}

// セクションヘッダー
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="text-muted-foreground">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* 重要なお知らせバナー */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">重要なお知らせ</p>
              <p className="text-sm text-yellow-700">
                お知らせがある場合はここに表示されます
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ピン留めセクション */}
      <section>
        <SectionHeader icon={<Pin className="w-5 h-5" />} title="ピン留め" />
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          <ToolTile title="ツール1" icon={<Folder className="w-6 h-6" />} />
          <ToolTile title="ツール2" icon={<Folder className="w-6 h-6" />} />
          <ToolTile title="ツール3" icon={<Folder className="w-6 h-6" />} />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          ピン留めされたツールがここに表示されます
        </p>
      </section>

      {/* お気に入りセクション */}
      <section>
        <SectionHeader icon={<Star className="w-5 h-5" />} title="お気に入り" />
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          <ToolTile title="ツールA" icon={<Folder className="w-6 h-6" />} />
          <ToolTile title="ツールB" icon={<Folder className="w-6 h-6" />} />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          お気に入りに追加したツールがここに表示されます
        </p>
      </section>

      {/* カテゴリショートカット */}
      <section>
        <SectionHeader icon={<Grid3X3 className="w-5 h-5" />} title="カテゴリ" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map((category) => (
            <Card key={category} className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium">{category}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* 全ツールセクション */}
      <section>
        <SectionHeader icon={<Folder className="w-5 h-5" />} title="全ツール" />
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-md font-medium text-muted-foreground mb-3 border-b pb-2">
                {category}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                <ToolTile title="サンプル" icon={<Folder className="w-6 h-6" />} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
