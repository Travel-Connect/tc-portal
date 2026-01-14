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
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Folder, Edit, Check, AlertCircle, GripVertical } from "lucide-react";
import { ToolTile } from "@/components/tools";
import { saveToolOrders } from "@/lib/actions/tool-orders";
import type { Tool, Category } from "@/types/database";

interface AllToolsSectionProps {
  tools: Tool[];
  categories: Category[];
}

// ドラッグ可能なToolTile
function SortableToolTile({ tool, editMode }: { tool: Tool; editMode: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tool.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (editMode) {
    return (
      <div ref={setNodeRef} style={style} className="relative group">
        <div
          {...attributes}
          {...listeners}
          className="absolute -top-1 -left-1 z-10 p-1 cursor-grab active:cursor-grabbing bg-white rounded shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>
        <ToolTile tool={tool} disableLink />
      </div>
    );
  }

  return <ToolTile tool={tool} />;
}

export function AllToolsSection({ tools: initialTools, categories }: AllToolsSectionProps) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [tools, setTools] = useState(initialTools);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Group tools by category
  const toolsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = tools.filter((t) => t.category_id === category.id);
    return acc;
  }, {} as Record<string, Tool[]>);

  const handleEditToggle = () => {
    if (editMode) handleSave();
    setEditMode(!editMode);
  };

  const handleSave = () => {
    setSaveStatus("saving");
    const orders = tools.map((tool, index) => ({ tool_id: tool.id, sort_index: index }));
    startTransition(async () => {
      const result = await saveToolOrders(orders);
      if (result.success) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
        router.refresh();
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
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

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground"><Folder className="w-5 h-5" /></div>
          <h2 className="text-lg font-semibold">全ツール</h2>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "saved" && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Check className="w-3 h-3" />保存完了
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />保存失敗
            </span>
          )}
          <button
            onClick={handleEditToggle}
            disabled={isPending}
            className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
              editMode 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            <Edit className="w-3 h-3" />
            {editMode ? "完了" : "並替"}
          </button>
        </div>
      </div>

      {editMode && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          編集モード: ツールをドラッグして順序を変更できます（同一カテゴリ内のみ）
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="space-y-6">
          {categories.map((category) => {
            const categoryTools = toolsByCategory[category.id] || [];
            return (
              <div key={category.id}>
                <h3 className="text-md font-medium text-muted-foreground mb-3 border-b pb-2">
                  {category.name}
                </h3>
                {categoryTools.length > 0 ? (
                  <SortableContext items={categoryTools.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {categoryTools.map((tool) => (
                        <SortableToolTile key={tool.id} tool={tool} editMode={editMode} />
                      ))}
                    </div>
                  </SortableContext>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    このカテゴリにはツールがありません
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </DndContext>
    </section>
  );
}
