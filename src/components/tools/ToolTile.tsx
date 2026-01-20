"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Tool } from "@/types/database";
import { ToolIcon } from "./ToolIcon";
import { ExecuteConfirmDialog } from "./ExecuteConfirmDialog";
import {
  isSafeHelperTool,
  requiresConfirmation,
  generateHelperUrl,
} from "@/lib/helper";
import { createHelperRun } from "@/lib/actions/runs";

interface ToolTileProps {
  tool: Tool;
  disableLink?: boolean;
}

export function ToolTile({ tool, disableLink = false }: ToolTileProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  // 安全なHelperツールを即起動（確認なし）
  const launchSafeHelper = () => {
    const helperUrl = generateHelperUrl(tool);
    if (!helperUrl) {
      router.push(`/tools/${tool.id}`);
      return;
    }
    window.location.href = helperUrl;
    createHelperRun(tool.id).catch(() => {});
  };

  // タイルクリックのハンドラ（ToolCardと同じロジック）
  const handleClick = () => {
    if (disableLink) return;

    switch (tool.execution_mode) {
      case "open":
        if ((tool.tool_type === "url" || tool.tool_type === "sheet") && tool.target) {
          window.open(tool.target, "_blank", "noopener,noreferrer");
          return;
        }
        router.push(`/tools/${tool.id}`);
        break;

      case "helper":
        if (isSafeHelperTool(tool)) {
          launchSafeHelper();
        } else {
          setDialogOpen(true);
        }
        break;

      case "queue":
        setDialogOpen(true);
        break;

      default:
        router.push(`/tools/${tool.id}`);
    }
  };

  const needsConfirmation = requiresConfirmation(tool);

  const tileContent = (
    <div
      data-testid={`tool-tile-${tool.id}`}
      className={`flex flex-col items-center justify-center p-4 bg-card border rounded-lg transition-colors ${disableLink ? "" : "hover:bg-accent/50 cursor-pointer"}`}
      onClick={handleClick}
    >
      <div className="w-10 h-10 flex items-center justify-center text-muted-foreground mb-2">
        <ToolIcon tool={tool} className="w-6 h-6" />
      </div>
      <span className="text-sm font-medium text-center line-clamp-2">{tool.name}</span>
    </div>
  );

  if (needsConfirmation) {
    return (
      <>
        {tileContent}
        <ExecuteConfirmDialog tool={tool} open={dialogOpen} onOpenChange={setDialogOpen}>
          <span className="hidden" />
        </ExecuteConfirmDialog>
      </>
    );
  }

  return tileContent;
}
