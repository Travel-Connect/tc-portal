"use client";

import { useState, useRef } from "react";
import { GripVertical, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  RichTextToolbar,
  applyFormat,
  handleKeyboardShortcut,
  type FormatType,
} from "./RichTextToolbar";
import { MentionPicker, isMentionActive } from "./MentionPicker";
import type { Profile } from "@/types/database";

interface RichTextEditorProps {
  /**
   * テキスト値
   */
  value: string;
  /**
   * テキスト変更時のコールバック
   */
  onChange: (value: string) => void;
  /**
   * 送信時のコールバック
   */
  onSubmit?: () => void;
  /**
   * プレースホルダー
   */
  placeholder?: string;
  /**
   * 無効状態
   */
  disabled?: boolean;
  /**
   * 送信中状態
   */
  isSubmitting?: boolean;
  /**
   * メンション候補となるユーザーリスト
   */
  users?: Profile[];
  /**
   * メンションが挿入された時のコールバック
   */
  onMentionInserted?: (userId: string, displayName: string) => void;
  /**
   * 最小高さ (px)
   */
  minHeight?: number;
  /**
   * 最大高さ (px)
   */
  maxHeight?: number;
  /**
   * リサイズ可能かどうか
   */
  resizable?: boolean;
  /**
   * ツールバーを表示するかどうか
   */
  showToolbar?: boolean;
  /**
   * 追加のクラス名
   */
  className?: string;
  /**
   * テキストエリアの参照を外部に公開
   */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * リッチテキストエディタ
 * ツールバー + テキストエリア + メンションピッカーを統合
 */
export function RichTextEditor({
  value,
  onChange,
  onSubmit,
  placeholder = "メッセージを入力...",
  disabled = false,
  isSubmitting = false,
  users = [],
  onMentionInserted,
  minHeight = 60,
  maxHeight = 300,
  resizable = true,
  showToolbar = true,
  className,
  textareaRef: externalTextareaRef,
}: RichTextEditorProps) {
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef || internalTextareaRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(minHeight);
  const [isResizing, setIsResizing] = useState(false);

  // 書式適用
  const handleFormat = (type: FormatType, formatValue?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const newText = applyFormat(textarea, type, formatValue);
    onChange(newText);
  };

  // キーボードイベント処理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // メンションピッカーが開いている場合はEnterを無視
    if (e.key === "Enter" && isMentionActive(value, textarea.selectionStart)) {
      return;
    }

    // ショートカットキー処理
    if (handleKeyboardShortcut(e, textarea, onChange)) {
      return;
    }

    // Enter で送信（Shift+Enter で改行）
    if (e.key === "Enter" && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  // リサイズ処理
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!resizable) return;

    e.preventDefault();
    setIsResizing(true);

    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.min(
        Math.max(startHeight + deltaY, minHeight),
        maxHeight
      );
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // 送信ボタンの有効/無効
  const canSubmit = value.trim().length > 0 && !isSubmitting && !disabled;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative border rounded-md bg-background",
        disabled && "opacity-50",
        className
      )}
    >
      {/* リサイズハンドル（上部） */}
      {resizable && (
        <div
          className={cn(
            "flex items-center justify-center h-3 cursor-ns-resize bg-muted/30 hover:bg-muted/50 transition-colors border-b",
            isResizing && "bg-muted/50"
          )}
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground rotate-90" />
        </div>
      )}

      {/* ツールバー */}
      {showToolbar && (
        <RichTextToolbar
          onFormat={handleFormat}
          disabled={disabled || isSubmitting}
        />
      )}

      {/* テキストエリア + メンションピッカー */}
      <div className="relative">
        <MentionPicker
          users={users}
          textareaRef={textareaRef}
          text={value}
          onTextChange={onChange}
          onMentionInserted={onMentionInserted}
        />

        <Textarea
          ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          className={cn(
            "border-0 rounded-none focus-visible:ring-0 resize-none pr-10",
            !showToolbar && "rounded-t-md"
          )}
          style={{ height: `${height}px`, minHeight: `${minHeight}px` }}
        />

        {/* 送信ボタン */}
        {onSubmit && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-1 bottom-1 h-8 w-8"
            onClick={onSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* ヘルプテキスト */}
      <div className="px-3 py-1.5 text-xs text-muted-foreground border-t bg-muted/10">
        <span>Enter で送信 / Shift+Enter で改行</span>
        {showToolbar && (
          <span className="ml-2">/ Ctrl+B 太字, Ctrl+I 斜体, @ メンション</span>
        )}
      </div>
    </div>
  );
}

/**
 * シンプルなリサイズ可能テキストエリア（ツールバーなし）
 */
export function ResizableTextarea({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  isSubmitting,
  minHeight = 60,
  maxHeight = 300,
  className,
  textareaRef: externalTextareaRef,
}: Omit<RichTextEditorProps, "users" | "onMentionInserted" | "showToolbar" | "resizable">) {
  return (
    <RichTextEditor
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      placeholder={placeholder}
      disabled={disabled}
      isSubmitting={isSubmitting}
      minHeight={minHeight}
      maxHeight={maxHeight}
      resizable={true}
      showToolbar={false}
      className={className}
      textareaRef={externalTextareaRef}
    />
  );
}
