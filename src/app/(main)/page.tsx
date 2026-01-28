import Link from "next/link";
import { Grid3X3 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AllToolsSection, PinnedToolsSection } from "@/components/tools";
import { HomeAnnouncementsBanner } from "@/components/announcements";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/queries/categories";
import { getToolsWithUserOrder } from "@/lib/queries/tools";
import { getPinnedTools } from "@/lib/queries/pins";
import { getUserToolPreferences } from "@/lib/actions/tool-preferences";
import type { Tool, Category, ToolUserPreference } from "@/types/database";

// セクションヘッダー
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="text-muted-foreground">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}

// カテゴリカード
function CategoryCard({ category }: { category: Category }) {
  return (
    <Link href="/tools">
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">{category.name}</CardTitle>
        </CardHeader>
      </Card>
    </Link>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch all data in parallel
  const [categories, allTools, pinnedTools, prefsResult] = await Promise.all([
    getCategories(),
    getToolsWithUserOrder(),
    user ? getPinnedTools(user.id) : Promise.resolve([]),
    user ? getUserToolPreferences() : Promise.resolve({ success: true, preferences: {} }),
  ]);

  // Convert to Tool[] (remove categories relation)
  const toolsForSection = allTools.map((t) => ({ ...t, categories: undefined } as Tool));

  // ユーザー設定のカラーマップ
  const colorPreferences: Record<string, ToolUserPreference> = prefsResult.preferences || {};

  return (
    <div className="space-y-8">
      {/* お知らせバナー（未読最大3件） */}
      <HomeAnnouncementsBanner />

      {/* ピン留めセクション */}
      <PinnedToolsSection tools={pinnedTools as Tool[]} colorPreferences={colorPreferences} />

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
      <AllToolsSection tools={toolsForSection} categories={categories} colorPreferences={colorPreferences} />
    </div>
  );
}
