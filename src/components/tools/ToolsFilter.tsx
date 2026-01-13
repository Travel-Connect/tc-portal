"use client";

import { useState } from "react";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToolCard } from "./ToolCard";
import type { Tool, Category, ToolType } from "@/types/database";
import { TOOL_TYPE_LABELS } from "@/types/database";

interface ToolWithCategory extends Tool {
  categories: Category | null;
}

interface ToolsFilterProps {
  tools: ToolWithCategory[];
  categories: Category[];
  favoriteIds: string[];
  pinnedIds: string[];
  searchQuery?: string;
}

const TOOL_TYPES: ToolType[] = [
  "url",
  "sheet",
  "excel",
  "bi",
  "exe",
  "python_runner",
  "pad",
  "folder_set",
  "shortcut",
];

export function ToolsFilter({
  tools,
  categories,
  favoriteIds,
  pinnedIds,
  searchQuery,
}: ToolsFilterProps) {
  const [selectedType, setSelectedType] = useState<ToolType | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Filter tools by type and search
  const filteredTools = tools.filter((tool) => {
    // Filter by type
    if (selectedType && tool.tool_type !== selectedType) {
      return false;
    }
    // Filter by search query
    if (searchQuery) {
      return tool.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Group filtered tools by category
  const toolsByCategory = categories.reduce((acc, category) => {
    const categoryTools = filteredTools.filter((t) => t.category_id === category.id);
    if (categoryTools.length > 0) {
      acc[category.id] = categoryTools;
    }
    return acc;
  }, {} as Record<string, ToolWithCategory[]>);

  // Get categories that have tools
  const categoriesWithTools = categories.filter((c) => toolsByCategory[c.id]?.length > 0);

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
          {searchQuery && (
            <p className="text-sm text-muted-foreground mb-3">
              「{searchQuery}」の検索結果: {filteredTools.length}件
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedType === null ? "secondary" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedType(null)}
            >
              すべて
            </Badge>
            {TOOL_TYPES.map((type) => (
              <Badge
                key={type}
                variant={selectedType === type ? "secondary" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedType(type)}
              >
                {TOOL_TYPE_LABELS[type]}
              </Badge>
            ))}
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
      {categoriesWithTools.length > 0 ? (
        <div className="space-y-8">
          {categoriesWithTools.map((category) => (
            <section key={category.id}>
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">
                {category.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {toolsByCategory[category.id]?.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    category={tool.categories}
                    isFavorite={favoriteIds.includes(tool.id)}
                    isPinned={pinnedIds.includes(tool.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {searchQuery
                ? `「${searchQuery}」に一致するツールが見つかりませんでした`
                : "ツールがありません"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
