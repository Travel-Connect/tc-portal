"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Edit, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SortableToolCard } from "./SortableToolCard";
import { HelperGuideBanner } from "./HelperGuideBanner";
import type { Tool, Category, ToolType } from "@/types/database";
import { TOOL_TYPE_LABELS } from "@/types/database";
import { saveToolOrders } from "@/lib/actions/tool-orders";

interface ToolWithCategory extends Tool {
  categories: Category | null;
}

interface ToolsFilterProps {
  tools: ToolWithCategory[];
  categories: Category[];
  pinnedIds: string[];
  searchQuery?: string;
}

const TOOL_TYPES: ToolType[] = [
  "url", "sheet", "excel", "bi", "exe", "python_runner", "pad", "folder", "folder_set", "bat",
];

export function ToolsFilter({
  tools: initialTools,
  categories,
  pinnedIds,
  searchQuery: initialSearchQuery,
}: ToolsFilterProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<ToolType | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [tools, setTools] = useState(initialTools);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchQuery = editMode ? "" : initialSearchQuery;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredTools = tools.filter((tool) => {
    if (selectedType && tool.tool_type !== selectedType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameMatch = tool.name.toLowerCase().includes(query);
      const tagMatch = tool.tags?.some((tag) => tag.toLowerCase().includes(query)) ?? false;
      return nameMatch || tagMatch;
    }
    return true;
  });

  const toolsByCategory = categories.reduce((acc, category) => {
    const categoryTools = filteredTools.filter((t) => t.category_id === category.id);
    if (categoryTools.length > 0) acc[category.id] = categoryTools;
    return acc;
  }, {} as Record<string, ToolWithCategory[]>);

  const categoriesWithTools = categories.filter((c) => toolsByCategory[c.id]?.length > 0);

  const handleEditToggle = () => {
    if (editMode) handleSave();
    else setSelectedType(null);
    setEditMode(!editMode);
  };

  const handleSave = () => {
    setSaveStatus("saving");
    setErrorMessage(null);
    const orders = tools.map((tool, index) => ({ tool_id: tool.id, sort_index: index }));
    startTransition(async () => {
      const result = await saveToolOrders(orders);
      if (result.success) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
        router.refresh();
      } else {
        console.error("Save failed:", result.error);
        setErrorMessage(result.error || "保存に失敗しました");
        setSaveStatus("error");
        setTimeout(() => {
          setSaveStatus("idle");
          setErrorMessage(null);
        }, 5000);
      }
    });
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTools((currentTools) => {
      const oldIndex = currentTools.findIndex((t) => t.id === active.id);
      const newIndex = currentTools.findIndex((t) => t.id === over.id);
      const activeTool = currentTools[oldIndex];
      const overTool = currentTools[newIndex];
      if (activeTool.category_id !== overTool.category_id) return currentTools;
      return arrayMove(currentTools, oldIndex, newIndex);
    });
  }, []);

  const badgeClass = editMode ? "cursor-pointer opacity-50 pointer-events-none" : "cursor-pointer";

  return (
    <div className="space-y-6">
      <HelperGuideBanner className="mb-2" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ツール</h1>
        <div className="flex items-center gap-2">
          {saveStatus === "saved" && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" />保存完了
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-red-600 flex items-center gap-1" title={errorMessage || undefined}>
              <AlertCircle className="w-4 h-4" />保存失敗
            </span>
          )}
          {errorMessage && (
            <span className="text-sm text-red-500 max-w-xs truncate" title={errorMessage}>
              {errorMessage}
            </span>
          )}
          <Button variant={editMode ? "default" : "outline"} onClick={handleEditToggle} disabled={isPending}>
            <Edit className="w-4 h-4 mr-2" />
            {editMode ? "編集完了" : "編集"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          {searchQuery && !editMode && (
            <p className="text-sm text-muted-foreground mb-3">
              「{searchQuery}」の検索結果: {filteredTools.length}件
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedType === null ? "secondary" : "outline"}
              className={badgeClass}
              onClick={() => !editMode && setSelectedType(null)}
            >すべて</Badge>
            {TOOL_TYPES.map((type) => (
              <Badge
                key={type}
                variant={selectedType === type ? "secondary" : "outline"}
                className={badgeClass}
                onClick={() => !editMode && setSelectedType(type)}
              >{TOOL_TYPE_LABELS[type]}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {editMode && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <p className="text-sm text-blue-800">
              編集モード: 左のハンドルをドラッグしてツールの順序を変更できます。同一カテゴリ内でのみ移動可能です。
            </p>
          </CardContent>
        </Card>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {categoriesWithTools.length > 0 ? (
          <div className="space-y-8">
            {categoriesWithTools.map((category) => {
              const categoryTools = toolsByCategory[category.id] || [];
              return (
                <section key={category.id}>
                  <h2 className="text-lg font-semibold mb-4 pb-2 border-b">{category.name}</h2>
                  <SortableContext items={categoryTools.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {categoryTools.map((tool) => (
                        <SortableToolCard
                          key={tool.id}
                          tool={tool}
                          category={tool.categories}
                          isPinned={pinnedIds.includes(tool.id)}
                          editMode={editMode}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </section>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? `「${searchQuery}」に一致するツールが見つかりませんでした` : "ツールがありません"}
              </p>
            </CardContent>
          </Card>
        )}
      </DndContext>
    </div>
  );
}
