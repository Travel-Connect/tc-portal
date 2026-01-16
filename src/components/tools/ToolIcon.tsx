/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { icons, type LucideIcon } from "lucide-react";
import { Folder } from "lucide-react";
import type { Tool } from "@/types/database";
import { getToolIconUrl } from "@/lib/supabase/storage";

interface ToolIconProps {
  tool: Pick<Tool, "icon_mode" | "icon_key" | "icon_path">;
  className?: string;
}

export function ToolIcon({ tool, className = "w-6 h-6" }: ToolIconProps) {
  const [imageError, setImageError] = useState(false);

  if (tool.icon_mode === "upload" && tool.icon_path && !imageError) {
    const imageUrl = getToolIconUrl(tool.icon_path);
    return (
      <img
        src={imageUrl}
        alt=""
        className={`${className} object-contain rounded`}
        onError={() => setImageError(true)}
      />
    );
  }

  if (tool.icon_mode === "lucide" && tool.icon_key) {
    // Dynamically get the icon from lucide-react
    const IconComponent = icons[tool.icon_key as keyof typeof icons] as LucideIcon | undefined;
    if (IconComponent) {
      return <IconComponent className={className} />;
    }
  }

  // Default icon
  return <Folder className={className} />;
}
