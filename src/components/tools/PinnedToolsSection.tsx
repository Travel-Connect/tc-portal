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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pin, Edit, Check, AlertCircle, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolTile } from "./ToolTile";
import type { Tool } from "@/types/database";
import { savePinOrders } from "@/lib/actions/favorites";

interface PinnedToolsSectionProps {
  tools: Tool[];
}

// ソート可能なタイル
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
      <div ref={setNodeRef} style={style} className="relative">
        <div
          {...attributes}
          {...listeners}
          className="absolute -top-2 -right-2 z-10 p-1 cursor-grab active:cursor-grabbing bg-white rounded-full shadow-sm border hover:bg-gray-50"
        >
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>
        <ToolTile tool={tool} disableLink />
      </div>
    );
  }

  return <ToolTile tool={tool} />;
}

export function PinnedToolsSection({ tools: initialTools }: PinnedToolsSectionProps) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [tools, setTools] = useState(initialTools);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleEditToggle = () => {
    if (editMode) {
      handleSave();
    }
    setEditMode(!editMode);
  };

  const handleSave = () => {
    setSaveStatus("saving");
    setErrorMessage(null);
    const orders = tools.map((tool, index) => ({ tool_id: tool.id, sort_order: index }));
    startTransition(async () => {
      const result = await savePinOrders(orders);
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
      return arrayMove(currentTools, oldIndex, newIndex);
    });
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">
            <Pin className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold">ピン留め</h2>
        </div>
        {tools.length > 0 && (
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
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              onClick={handleEditToggle}
              disabled={isPending}
            >
              <Edit className="w-4 h-4 mr-1" />
              {editMode ? "完了" : "編集"}
            </Button>
          </div>
        )}
      </div>

      {tools.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tools.map((t) => t.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {tools.map((tool) => (
                <SortableToolTile key={tool.id} tool={tool} editMode={editMode} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center bg-muted/30 rounded-lg">
          まだピン留めがありません
        </p>
      )}
    </section>
  );
}
