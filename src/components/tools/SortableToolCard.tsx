"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ToolCard } from "./ToolCard";
import type { Tool, Category } from "@/types/database";

interface SortableToolCardProps {
  tool: Tool & { categories: Category | null };
  category: Category | null;
  isPinned: boolean;
  editMode: boolean;
}

export function SortableToolCard({
  tool,
  category,
  isPinned,
  editMode,
}: SortableToolCardProps) {
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
          className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 p-1 cursor-grab active:cursor-grabbing bg-white rounded shadow-sm border hover:bg-gray-50"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <ToolCard
          tool={tool}
          category={category}
          isPinned={isPinned}
          disableLink
        />
      </div>
    );
  }

  return (
    <ToolCard
      tool={tool}
      category={category}
      isPinned={isPinned}
    />
  );
}
