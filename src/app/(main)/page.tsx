import { Bell, Pin, Star, Grid3X3, Folder } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToolTile } from "@/components/tools";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/queries/categories";
import { getToolsWithUserOrder } from "@/lib/queries/tools";
import { getFavoriteTools } from "@/lib/queries/favorites";
import { getPinnedTools } from "@/lib/queries/pins";
import type { Tool, Category } from "@/types/database";

// セクションヘッダー
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="text-muted-foreground">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}

// 空の状態表示
function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground py-4 text-center bg-muted/30 rounded-lg">
      {message}
    </p>
  );
}

// カテゴリカード
function CategoryCard({ category }: { category: Category }) {
  return (
    <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">{category.name}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch all data in parallel
  const [categories, allTools, pinnedTools, favoriteTools] = await Promise.all([
    getCategories(),
    getToolsWithUserOrder(),
    user ? getPinnedTools(user.id) : Promise.resolve([]),
    user ? getFavoriteTools(user.id) : Promise.resolve([]),
  ]);

  // Group tools by category
  const toolsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = allTools
      .filter((t) => t.category_id === category.id)
      .map((t) => ({ ...t, categories: undefined } as Tool));
    return acc;
  }, {} as Record<string, Tool[]>);

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
        {pinnedTools.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {pinnedTools.map((tool) => (
              <ToolTile key={tool.id} tool={tool} />
            ))}
          </div>
        ) : (
          <EmptyState message="まだピン留めがありません" />
        )}
      </section>

      {/* お気に入りセクション */}
      <section>
        <SectionHeader icon={<Star className="w-5 h-5" />} title="お気に入り" />
        {favoriteTools.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {favoriteTools.map((tool) => (
              <ToolTile key={tool.id} tool={tool} />
            ))}
          </div>
        ) : (
          <EmptyState message="まだお気に入りがありません" />
        )}
      </section>

      {/* カテゴリショートカット */}
      <section>
        <SectionHeader icon={<Grid3X3 className="w-5 h-5" />} title="カテゴリ" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      {/* 全ツールセクション */}
      <section>
        <SectionHeader icon={<Folder className="w-5 h-5" />} title="全ツール" />
        <div className="space-y-6">
          {categories.map((category) => {
            const categoryTools = toolsByCategory[category.id] || [];
            return (
              <div key={category.id}>
                <h3 className="text-md font-medium text-muted-foreground mb-3 border-b pb-2">
                  {category.name}
                </h3>
                {categoryTools.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {categoryTools.map((tool) => (
                      <ToolTile key={tool.id} tool={tool} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    このカテゴリにはツールがありません
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
