"use client";

import { useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link,
  Code,
  Palette,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// 書式設定の定義
export type FormatType =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "orderedList"
  | "unorderedList"
  | "quote"
  | "link"
  | "codeBlock"
  | "color"
  | "size";

// 色オプション
export const COLOR_OPTIONS = [
  { value: "red", label: "赤", class: "bg-red-500" },
  { value: "yellow", label: "黄", class: "bg-yellow-500" },
  { value: "green", label: "緑", class: "bg-green-500" },
  { value: "blue", label: "青", class: "bg-blue-500" },
  { value: "purple", label: "紫", class: "bg-purple-500" },
] as const;

// サイズオプション
export const SIZE_OPTIONS = [
  { value: "sm", label: "小" },
  { value: "md", label: "中" },
  { value: "lg", label: "大" },
] as const;

export type ColorValue = (typeof COLOR_OPTIONS)[number]["value"];
export type SizeValue = (typeof SIZE_OPTIONS)[number]["value"];

interface RichTextToolbarProps {
  onFormat: (type: FormatType, value?: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * リッチテキスト用ツールバー
 * 書式設定ボタンを提供
 */
export function RichTextToolbar({
  onFormat,
  disabled,
  className,
}: RichTextToolbarProps) {
  const handleFormat = useCallback(
    (type: FormatType, value?: string) => {
      if (!disabled) {
        onFormat(type, value);
      }
    },
    [onFormat, disabled]
  );

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 p-1 border-b bg-muted/30 rounded-t-md flex-wrap",
        className
      )}
    >
      {/* 太字 */}
      <ToolbarButton
        icon={<Bold className="h-4 w-4" />}
        title="太字 (Ctrl+B)"
        onClick={() => handleFormat("bold")}
        disabled={disabled}
      />

      {/* 斜体 */}
      <ToolbarButton
        icon={<Italic className="h-4 w-4" />}
        title="斜体 (Ctrl+I)"
        onClick={() => handleFormat("italic")}
        disabled={disabled}
      />

      {/* 下線 */}
      <ToolbarButton
        icon={<Underline className="h-4 w-4" />}
        title="下線 (Ctrl+U)"
        onClick={() => handleFormat("underline")}
        disabled={disabled}
      />

      {/* 取り消し線 */}
      <ToolbarButton
        icon={<Strikethrough className="h-4 w-4" />}
        title="取り消し線 (Ctrl+Shift+X)"
        onClick={() => handleFormat("strikethrough")}
        disabled={disabled}
      />

      <Separator />

      {/* 番号付きリスト */}
      <ToolbarButton
        icon={<ListOrdered className="h-4 w-4" />}
        title="番号付きリスト (Ctrl+Shift+7)"
        onClick={() => handleFormat("orderedList")}
        disabled={disabled}
      />

      {/* 箇条書き */}
      <ToolbarButton
        icon={<List className="h-4 w-4" />}
        title="箇条書き (Ctrl+Shift+8)"
        onClick={() => handleFormat("unorderedList")}
        disabled={disabled}
      />

      {/* 引用 */}
      <ToolbarButton
        icon={<Quote className="h-4 w-4" />}
        title="引用 (Ctrl+Shift+>)"
        onClick={() => handleFormat("quote")}
        disabled={disabled}
      />

      <Separator />

      {/* リンク */}
      <ToolbarButton
        icon={<Link className="h-4 w-4" />}
        title="リンク (Ctrl+Shift+U)"
        onClick={() => handleFormat("link")}
        disabled={disabled}
      />

      {/* コードブロック */}
      <ToolbarButton
        icon={<Code className="h-4 w-4" />}
        title="コードブロック (Ctrl+Alt+C)"
        onClick={() => handleFormat("codeBlock")}
        disabled={disabled}
      />

      <Separator />

      {/* 文字色 */}
      <ColorPicker
        onSelect={(color) => handleFormat("color", color)}
        disabled={disabled}
      />

      {/* 文字サイズ */}
      <SizePicker
        onSelect={(size) => handleFormat("size", size)}
        disabled={disabled}
      />
    </div>
  );
}

// ツールバーボタン
function ToolbarButton({
  icon,
  title,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {icon}
    </Button>
  );
}

// セパレータ
function Separator() {
  return <div className="w-px h-5 bg-border mx-1" />;
}

// 色選択ポップオーバー
function ColorPicker({
  onSelect,
  disabled,
}: {
  onSelect: (color: ColorValue) => void;
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={disabled}
          title="文字色"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex gap-1">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color.value}
              type="button"
              className={cn(
                "w-6 h-6 rounded-full border-2 border-transparent hover:border-foreground/50 transition-colors",
                color.class
              )}
              onClick={() => onSelect(color.value)}
              title={color.label}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// サイズ選択ポップオーバー
function SizePicker({
  onSelect,
  disabled,
}: {
  onSelect: (size: SizeValue) => void;
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={disabled}
          title="文字サイズ"
        >
          <Type className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex flex-col gap-1">
          {SIZE_OPTIONS.map((size) => (
            <button
              key={size.value}
              type="button"
              className={cn(
                "px-3 py-1 text-left rounded hover:bg-muted transition-colors",
                size.value === "sm" && "text-xs",
                size.value === "md" && "text-sm",
                size.value === "lg" && "text-lg"
              )}
              onClick={() => onSelect(size.value)}
            >
              {size.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * テキストエリアに書式を適用するユーティリティ関数
 */
export function applyFormat(
  textarea: HTMLTextAreaElement,
  type: FormatType,
  value?: string
): string {
  const { selectionStart, selectionEnd, value: text } = textarea;
  const selectedText = text.substring(selectionStart, selectionEnd);
  const beforeText = text.substring(0, selectionStart);
  const afterText = text.substring(selectionEnd);

  let newText = "";
  let newCursorPos = selectionStart;

  switch (type) {
    case "bold":
      newText = `${beforeText}**${selectedText || "太字テキスト"}**${afterText}`;
      newCursorPos = selectionStart + 2;
      break;

    case "italic":
      newText = `${beforeText}*${selectedText || "斜体テキスト"}*${afterText}`;
      newCursorPos = selectionStart + 1;
      break;

    case "underline":
      newText = `${beforeText}<u>${selectedText || "下線テキスト"}</u>${afterText}`;
      newCursorPos = selectionStart + 3;
      break;

    case "strikethrough":
      newText = `${beforeText}~~${selectedText || "取り消しテキスト"}~~${afterText}`;
      newCursorPos = selectionStart + 2;
      break;

    case "orderedList":
      if (selectedText) {
        const lines = selectedText.split("\n");
        const numbered = lines.map((line, i) => `${i + 1}. ${line}`).join("\n");
        newText = `${beforeText}${numbered}${afterText}`;
      } else {
        newText = `${beforeText}1. ${afterText}`;
      }
      newCursorPos = selectionStart + 3;
      break;

    case "unorderedList":
      if (selectedText) {
        const lines = selectedText.split("\n");
        const bulleted = lines.map((line) => `- ${line}`).join("\n");
        newText = `${beforeText}${bulleted}${afterText}`;
      } else {
        newText = `${beforeText}- ${afterText}`;
      }
      newCursorPos = selectionStart + 2;
      break;

    case "quote":
      if (selectedText) {
        const lines = selectedText.split("\n");
        const quoted = lines.map((line) => `> ${line}`).join("\n");
        newText = `${beforeText}${quoted}${afterText}`;
      } else {
        newText = `${beforeText}> ${afterText}`;
      }
      newCursorPos = selectionStart + 2;
      break;

    case "link": {
      const url = prompt("URLを入力してください:", "https://");
      if (url) {
        const linkText = selectedText || "リンクテキスト";
        newText = `${beforeText}[${linkText}](${url})${afterText}`;
        newCursorPos = selectionStart + 1;
      } else {
        return text;
      }
      break;
    }

    case "codeBlock":
      if (selectedText) {
        newText = `${beforeText}\`\`\`\n${selectedText}\n\`\`\`${afterText}`;
      } else {
        newText = `${beforeText}\`\`\`\nコード\n\`\`\`${afterText}`;
      }
      newCursorPos = selectionStart + 4;
      break;

    case "color":
      if (value) {
        newText = `${beforeText}<span data-color="${value}">${selectedText || "テキスト"}</span>${afterText}`;
        newCursorPos = selectionStart + 20 + value.length;
      } else {
        return text;
      }
      break;

    case "size":
      if (value) {
        newText = `${beforeText}<span data-size="${value}">${selectedText || "テキスト"}</span>${afterText}`;
        newCursorPos = selectionStart + 19 + value.length;
      } else {
        return text;
      }
      break;

    default:
      return text;
  }

  // カーソル位置を更新（選択テキストがない場合）
  setTimeout(() => {
    if (!selectedText) {
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }
    textarea.focus();
  }, 0);

  return newText;
}

/**
 * キーボードショートカットを処理
 * @returns true: ショートカットが処理された, false: 処理されなかった
 */
export function handleKeyboardShortcut(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  textarea: HTMLTextAreaElement,
  onTextChange: (text: string) => void
): boolean {
  const isMod = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;
  const isAlt = e.altKey;
  const key = e.key.toLowerCase();

  let formatType: FormatType | null = null;

  // Ctrl+B: 太字
  if (isMod && !isShift && !isAlt && key === "b") {
    formatType = "bold";
  }
  // Ctrl+I: 斜体
  else if (isMod && !isShift && !isAlt && key === "i") {
    formatType = "italic";
  }
  // Ctrl+U: 下線
  else if (isMod && !isShift && !isAlt && key === "u") {
    formatType = "underline";
  }
  // Ctrl+Shift+X: 取り消し線
  else if (isMod && isShift && !isAlt && key === "x") {
    formatType = "strikethrough";
  }
  // Ctrl+Shift+7: 番号付きリスト
  else if (isMod && isShift && !isAlt && key === "7") {
    formatType = "orderedList";
  }
  // Ctrl+Shift+8: 箇条書き
  else if (isMod && isShift && !isAlt && key === "8") {
    formatType = "unorderedList";
  }
  // Ctrl+Shift+>: 引用
  else if (isMod && isShift && !isAlt && (key === ">" || key === ".")) {
    formatType = "quote";
  }
  // Ctrl+Shift+U: リンク (Ctrl+Uと被るため、Shift必須)
  // Note: Ctrl+Uは下線に使用するため、リンクはCtrl+Kに変更
  else if (isMod && !isShift && !isAlt && key === "k") {
    formatType = "link";
  }
  // Ctrl+Alt+C: コードブロック
  else if (isMod && !isShift && isAlt && key === "c") {
    formatType = "codeBlock";
  }

  if (formatType) {
    e.preventDefault();
    const newText = applyFormat(textarea, formatType);
    onTextChange(newText);
    return true;
  }

  return false;
}
