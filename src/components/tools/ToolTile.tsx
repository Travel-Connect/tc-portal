"use client";

import Link from "next/link";
import type { Tool } from "@/types/database";
import { ToolIcon } from "./ToolIcon";

interface ToolTileProps {
  tool: Tool;
  disableLink?: boolean;
}

export function ToolTile({ tool, disableLink = false }: ToolTileProps) {
  const tileContent = (
    <div className={`flex flex-col items-center justify-center p-4 bg-card border rounded-lg transition-colors ${disableLink ? "" : "hover:bg-accent/50 cursor-pointer"}`}>
      <div className="w-10 h-10 flex items-center justify-center text-muted-foreground mb-2">
        <ToolIcon tool={tool} className="w-6 h-6" />
      </div>
      <span className="text-sm font-medium text-center line-clamp-2">{tool.name}</span>
    </div>
  );

  if (disableLink) {
    return tileContent;
  }

  return (
    <Link href={`/tools/${tool.id}`}>
      {tileContent}
    </Link>
  );
}
