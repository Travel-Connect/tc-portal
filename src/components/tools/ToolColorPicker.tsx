"use client";

import { useState, useTransition } from "react";
import { Palette, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ColorPreset, ToolUserPreference } from "@/types/database";
import { COLOR_PRESET_VALUES, getEffectiveColor } from "@/types/database";
import { setToolColor, clearToolColor } from "@/lib/actions/tool-preferences";

interface ToolColorPickerProps {
  toolId: string;
  preference?: ToolUserPreference | null;
  onColorChange?: (color: string | null) => void;
}

const PRESET_OPTIONS: { key: ColorPreset; label: string }[] = [
  { key: "red", label: "赤" },
  { key: "yellow", label: "黄" },
  { key: "green", label: "緑" },
  { key: "blue", label: "青" },
  { key: "purple", label: "紫" },
];

export function ToolColorPicker({ toolId, preference, onColorChange }: ToolColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [customColor, setCustomColor] = useState(preference?.color_hex || "");
  const [error, setError] = useState<string | null>(null);

  const currentColor = getEffectiveColor(preference);
  const currentPreset = preference?.color_preset;

  const handlePresetSelect = (preset: ColorPreset) => {
    setError(null);
    startTransition(async () => {
      const result = await setToolColor(toolId, null, preset);
      if (result.success) {
        onColorChange?.(COLOR_PRESET_VALUES[preset]);
        setOpen(false);
      } else {
        setError(result.error || "保存に失敗しました");
      }
    });
  };

  const handleCustomColorSave = () => {
    if (!customColor.trim()) {
      setError("色コードを入力してください");
      return;
    }
    // Validate hex color
    const hex = customColor.startsWith("#") ? customColor : `#${customColor}`;
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setError("有効な色コード（例: #FF5733）を入力してください");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await setToolColor(toolId, hex, null);
      if (result.success) {
        onColorChange?.(hex);
        setOpen(false);
      } else {
        setError(result.error || "保存に失敗しました");
      }
    });
  };

  const handleClear = () => {
    setError(null);
    startTransition(async () => {
      const result = await clearToolColor(toolId);
      if (result.success) {
        onColorChange?.(null);
        setCustomColor("");
        setOpen(false);
      } else {
        setError(result.error || "クリアに失敗しました");
      }
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          title="色を設定"
        >
          {currentColor ? (
            <div
              className="w-4 h-4 rounded-full border border-gray-300"
              style={{ backgroundColor: currentColor }}
            />
          ) : (
            <Palette className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">カード色</Label>
            {currentColor && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={handleClear}
                disabled={isPending}
              >
                <X className="w-3 h-3 mr-1" />
                クリア
              </Button>
            )}
          </div>

          {/* Preset colors */}
          <div className="flex gap-2">
            {PRESET_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handlePresetSelect(key)}
                disabled={isPending}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                  currentPreset === key
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: COLOR_PRESET_VALUES[key] }}
                title={label}
              />
            ))}
          </div>

          {/* Custom color input */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">その他の色</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2">
                <Input
                  type="color"
                  value={customColor || "#3b82f6"}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-10 h-8 p-0 border-0 cursor-pointer"
                />
                <Input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="#FF5733"
                  className="flex-1 h-8 text-xs"
                />
              </div>
              <Button
                size="sm"
                className="h-8"
                onClick={handleCustomColorSave}
                disabled={isPending || !customColor.trim()}
              >
                {isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
