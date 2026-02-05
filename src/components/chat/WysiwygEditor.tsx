"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { Extension } from "@tiptap/core";
import { useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Code,
  Palette,
  Type,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// 色オプション
const COLOR_OPTIONS = [
  { value: "#ef4444", label: "赤", class: "bg-red-500" },
  { value: "#eab308", label: "黄", class: "bg-yellow-500" },
  { value: "#22c55e", label: "緑", class: "bg-green-500" },
  { value: "#3b82f6", label: "青", class: "bg-blue-500" },
  { value: "#a855f7", label: "紫", class: "bg-purple-500" },
] as const;

// フォントサイズ拡張
const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, ""),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: { chain: () => { setMark: (name: string, attrs: Record<string, unknown>) => { run: () => boolean } } }) => {
          return chain().setMark("textStyle", { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }: { chain: () => { setMark: (name: string, attrs: Record<string, unknown>) => { run: () => boolean } } }) => {
          return chain()
            .setMark("textStyle", { fontSize: null })
            .run();
        },
    } as const;
  },
});

// サイズオプション
const SIZE_OPTIONS = [
  { value: "0.75rem", label: "小" },
  { value: "1rem", label: "中" },
  { value: "1.25rem", label: "大" },
] as const;

export interface WysiwygEditorRef {
  focus: () => void;
  getHTML: () => string;
  clear: () => void;
}

interface WysiwygEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  minHeight?: number;
  maxHeight?: number;
  showToolbar?: boolean;
  className?: string;
  testId?: string;
}

/**
 * TipTapベースのWYSIWYGエディタ
 */
export const WysiwygEditor = forwardRef<WysiwygEditorRef, WysiwygEditorProps>(
  function WysiwygEditor(
    {
      value = "",
      onChange,
      onSubmit,
      placeholder = "メッセージを入力...",
      disabled = false,
      isSubmitting = false,
      minHeight = 60,
      maxHeight = 300,
      showToolbar = true,
      className,
      testId,
    },
    ref
  ) {
    const editor = useEditor({
      immediatelyRender: false, // SSR対応
      extensions: [
        StarterKit.configure({
          // 必要な機能だけ有効化
          heading: false,
          horizontalRule: false,
          codeBlock: {
            HTMLAttributes: {
              class: "bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto",
            },
          },
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-blue-600 underline hover:no-underline",
          },
        }),
        Placeholder.configure({
          placeholder,
        }),
        TextStyle,
        Color,
        FontSize,
      ],
      content: value,
      editable: !disabled && !isSubmitting,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class: cn(
            "prose prose-sm max-w-none focus:outline-none",
            "min-h-[60px] px-3 py-2"
          ),
          style: `min-height: ${minHeight}px; max-height: ${maxHeight}px; overflow-y: auto;`,
        },
        handleKeyDown: (view, event) => {
          // Enter で送信（Shift+Enter で改行）
          if (event.key === "Enter" && !event.shiftKey && onSubmit) {
            event.preventDefault();
            onSubmit();
            return true;
          }
          return false;
        },
      },
    });

    // refを外部に公開
    useImperativeHandle(ref, () => ({
      focus: () => editor?.commands.focus(),
      getHTML: () => editor?.getHTML() || "",
      clear: () => editor?.commands.clearContent(),
    }));

    // valueが外部から変更された場合に同期
    useEffect(() => {
      if (editor && value !== editor.getHTML()) {
        editor.commands.setContent(value);
      }
    }, [editor, value]);

    // disabled状態の同期
    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled && !isSubmitting);
      }
    }, [editor, disabled, isSubmitting]);

    // 送信ボタンの有効/無効
    const canSubmit =
      editor && editor.getText().trim().length > 0 && !isSubmitting && !disabled;

    // エディタがまだ初期化されていない場合はプレースホルダーを表示
    if (!editor) {
      return (
        <div
          className={cn(
            "relative border rounded-md bg-background",
            disabled && "opacity-50",
            className
          )}
          data-testid={testId}
        >
          <div
            className="px-3 py-2 text-muted-foreground"
            style={{ minHeight: minHeight }}
          >
            {placeholder}
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "relative border rounded-md bg-background",
          disabled && "opacity-50",
          className
        )}
        data-testid={testId}
      >
        {/* ツールバー */}
        {showToolbar && (
          <EditorToolbar editor={editor} disabled={disabled || isSubmitting} />
        )}

        {/* エディタ本体 */}
        <div className="relative">
          <EditorContent editor={editor} />

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
            <span className="ml-2">/ Ctrl+B 太字, Ctrl+I 斜体</span>
          )}
        </div>
      </div>
    );
  }
);

/**
 * エディタツールバー
 */
function EditorToolbar({
  editor,
  disabled,
}: {
  editor: Editor;
  disabled?: boolean;
}) {
  const setLink = useCallback(() => {
    const url = prompt("URLを入力してください:", "https://");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  return (
    <div className="flex items-center gap-0.5 p-1 border-b bg-muted/30 rounded-t-md flex-wrap">
      {/* 太字 */}
      <ToolbarButton
        icon={<Bold className="h-4 w-4" />}
        title="太字 (Ctrl+B)"
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        disabled={disabled}
      />

      {/* 斜体 */}
      <ToolbarButton
        icon={<Italic className="h-4 w-4" />}
        title="斜体 (Ctrl+I)"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        disabled={disabled}
      />

      {/* 下線 */}
      <ToolbarButton
        icon={<UnderlineIcon className="h-4 w-4" />}
        title="下線 (Ctrl+U)"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        disabled={disabled}
      />

      {/* 取り消し線 */}
      <ToolbarButton
        icon={<Strikethrough className="h-4 w-4" />}
        title="取り消し線"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        disabled={disabled}
      />

      <Separator />

      {/* 番号付きリスト */}
      <ToolbarButton
        icon={<ListOrdered className="h-4 w-4" />}
        title="番号付きリスト"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        disabled={disabled}
      />

      {/* 箇条書き */}
      <ToolbarButton
        icon={<List className="h-4 w-4" />}
        title="箇条書き"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        disabled={disabled}
      />

      {/* 引用 */}
      <ToolbarButton
        icon={<Quote className="h-4 w-4" />}
        title="引用"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        disabled={disabled}
      />

      <Separator />

      {/* リンク */}
      <ToolbarButton
        icon={<LinkIcon className="h-4 w-4" />}
        title="リンク"
        onClick={setLink}
        isActive={editor.isActive("link")}
        disabled={disabled}
      />

      {/* コードブロック */}
      <ToolbarButton
        icon={<Code className="h-4 w-4" />}
        title="コードブロック"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        disabled={disabled}
      />

      <Separator />

      {/* 文字色 */}
      <ColorPicker editor={editor} disabled={disabled} />

      {/* 文字サイズ */}
      <SizePicker editor={editor} disabled={disabled} />
    </div>
  );
}

// ツールバーボタン
function ToolbarButton({
  icon,
  title,
  onClick,
  isActive,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", isActive && "bg-muted")}
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
  editor,
  disabled,
}: {
  editor: Editor;
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
              onClick={() => {
                editor.chain().focus().setColor(color.value).run();
              }}
              title={color.label}
            />
          ))}
          {/* リセットボタン */}
          <button
            type="button"
            className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground hover:border-foreground/50 transition-colors flex items-center justify-center text-xs"
            onClick={() => {
              editor.chain().focus().unsetColor().run();
            }}
            title="色をリセット"
          >
            ×
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// サイズ選択ポップオーバー
function SizePicker({
  editor,
  disabled,
}: {
  editor: Editor;
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
                "px-3 py-1 text-left rounded hover:bg-muted transition-colors"
              )}
              style={{ fontSize: size.value }}
              onClick={() => {
                (editor.chain().focus() as unknown as { setFontSize: (size: string) => { run: () => void } }).setFontSize(size.value).run();
              }}
            >
              {size.label}
            </button>
          ))}
          {/* リセットボタン */}
          <button
            type="button"
            className="px-3 py-1 text-left rounded hover:bg-muted transition-colors text-sm border-t mt-1 pt-2"
            onClick={() => {
              (editor.chain().focus() as unknown as { unsetFontSize: () => { run: () => void } }).unsetFontSize().run();
            }}
          >
            サイズをリセット
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
