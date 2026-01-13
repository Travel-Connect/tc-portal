"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Star, Pin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tool, Category } from "@/types/database";
import { TOOL_TYPE_LABELS, TOOL_TYPE_VARIANTS } from "@/types/database";
import { ToolIcon } from "./ToolIcon";
import { toggleFavorite, togglePin } from "@/lib/actions/favorites";

interface ToolCardProps {
  tool: Tool;
  category?: Category | null;
  isFavorite?: boolean;
  isPinned?: boolean;
  showActions?: boolean;
}

export function ToolCard({
  tool,
  category,
  isFavorite = false,
  isPinned = false,
  showActions = true,
}: ToolCardProps) {
  const [optimisticFavorite, setOptimisticFavorite] = useState(isFavorite);
  const [optimisticPinned, setOptimisticPinned] = useState(isPinned);
  const [isPending, startTransition] = useTransition();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setOptimisticFavorite(!optimisticFavorite);
    startTransition(async () => {
      const result = await toggleFavorite(tool.id);
      if (!result.success) {
        // Revert on failure
        setOptimisticFavorite(result.isFavorite);
      }
    });
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setOptimisticPinned(!optimisticPinned);
    startTransition(async () => {
      const result = await togglePin(tool.id);
      if (!result.success) {
        // Revert on failure
        setOptimisticPinned(result.isPinned);
      }
    });
  };

  return (
    <Link href={`/tools/${tool.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <ToolIcon tool={tool} className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base truncate">{tool.name}</CardTitle>
                {category && (
                  <p className="text-sm text-muted-foreground truncate">{category.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Badge variant={TOOL_TYPE_VARIANTS[tool.tool_type]}>
                {TOOL_TYPE_LABELS[tool.tool_type]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
              {tool.description || "説明なし"}
            </p>
            {showActions && (
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handlePinClick}
                  disabled={isPending}
                  title={optimisticPinned ? "ピン解除" : "ピン留め"}
                >
                  <Pin
                    className={`w-4 h-4 ${optimisticPinned ? "fill-current text-blue-500" : "text-muted-foreground"}`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleFavoriteClick}
                  disabled={isPending}
                  title={optimisticFavorite ? "お気に入り解除" : "お気に入り追加"}
                >
                  <Star
                    className={`w-4 h-4 ${optimisticFavorite ? "fill-current text-yellow-500" : "text-muted-foreground"}`}
                  />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
