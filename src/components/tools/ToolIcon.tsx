/* eslint-disable @next/next/no-img-element */
import { icons, type LucideIcon } from "lucide-react";
import { Folder } from "lucide-react";
import type { Tool } from "@/types/database";

interface ToolIconProps {
  tool: Pick<Tool, "icon_mode" | "icon_key" | "icon_path">;
  className?: string;
}

export function ToolIcon({ tool, className = "w-6 h-6" }: ToolIconProps) {
  if (tool.icon_mode === "upload" && tool.icon_path) {
    return (
      <img
        src={tool.icon_path}
        alt=""
        className={`${className} object-contain rounded`}
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
