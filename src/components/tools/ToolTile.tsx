"use client";

import Link from "next/link";
import type { Tool } from "@/types/database";
import { ToolIcon } from "./ToolIcon";

interface ToolTileProps {
  tool: Tool;
}

export function ToolTile({ tool }: ToolTileProps) {
  return (
    <Link href={`/tools/${tool.id}`}>
      <div className="flex flex-col items-center justify-center p-4 bg-card border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
        <div className="w-10 h-10 flex items-center justify-center text-muted-foreground mb-2">
          <ToolIcon tool={tool} className="w-6 h-6" />
        </div>
        <span className="text-sm font-medium text-center line-clamp-2">{tool.name}</span>
      </div>
    </Link>
  );
}
