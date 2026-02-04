"use client";

import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

// 色のマッピング（data-color → Tailwind class）
const COLOR_CLASS_MAP: Record<string, string> = {
  red: "text-red-500",
  yellow: "text-yellow-500",
  green: "text-green-500",
  blue: "text-blue-500",
  purple: "text-purple-500",
};

// サイズのマッピング（data-size → Tailwind class）
const SIZE_CLASS_MAP: Record<string, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg",
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Markdown + カスタムHTML（<u>, <span data-*>, <mention>）をレンダリング
 * XSS対策としてDOMPurifyでサニタイズ
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => {
    if (!content) return "";

    // Markdownをパース（GFM有効）
    const rawHtml = marked.parse(content, {
      gfm: true,
      breaks: true,
    }) as string;

    // DOMPurifyの設定
    // 許可するタグと属性を設定
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        // 基本的なHTML
        "p", "br", "strong", "em", "del", "u", "span",
        // リスト
        "ul", "ol", "li",
        // 引用・コード
        "blockquote", "code", "pre",
        // リンク
        "a",
        // カスタムタグ
        "mention",
      ],
      ALLOWED_ATTR: [
        "href", "target", "rel",
        "data-color", "data-size", "data-user-id",
        "class",
      ],
      // リンクは新しいタブで開く
      ADD_ATTR: ["target"],
    });

    // data属性をclassに変換
    const processedHtml = convertDataAttributesToClasses(cleanHtml);

    return processedHtml;
  }, [content]);

  return (
    <div
      className={`markdown-content ${className || ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * data-color, data-size属性をTailwindクラスに変換
 * <mention>タグにハイライトクラスを追加
 */
function convertDataAttributesToClasses(html: string): string {
  // DOMParserを使ってHTMLを解析（クライアントサイドのみ）
  if (typeof window === "undefined") {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // data-color属性を持つ要素を処理
  doc.querySelectorAll("[data-color]").forEach((el) => {
    const color = el.getAttribute("data-color");
    if (color && COLOR_CLASS_MAP[color]) {
      el.classList.add(COLOR_CLASS_MAP[color]);
    }
    el.removeAttribute("data-color");
  });

  // data-size属性を持つ要素を処理
  doc.querySelectorAll("[data-size]").forEach((el) => {
    const size = el.getAttribute("data-size");
    if (size && SIZE_CLASS_MAP[size]) {
      el.classList.add(SIZE_CLASS_MAP[size]);
    }
    el.removeAttribute("data-size");
  });

  // <mention>タグにハイライトクラスを追加
  doc.querySelectorAll("mention").forEach((el) => {
    el.classList.add(
      "bg-blue-100",
      "dark:bg-blue-900/50",
      "text-blue-700",
      "dark:text-blue-300",
      "px-1",
      "rounded",
      "font-medium"
    );
  });

  // リンクにtarget="_blank"とrel="noopener noreferrer"を追加
  doc.querySelectorAll("a").forEach((el) => {
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener noreferrer");
    el.classList.add("text-blue-600", "dark:text-blue-400", "underline", "hover:no-underline");
  });

  return doc.body.innerHTML;
}

// MarkdownRenderer用のスタイル（globals.cssに追加するか、ここでインライン定義）
export const markdownStyles = `
  .markdown-content p {
    margin-bottom: 0.5em;
  }
  .markdown-content p:last-child {
    margin-bottom: 0;
  }
  .markdown-content ul,
  .markdown-content ol {
    margin-left: 1.5em;
    margin-bottom: 0.5em;
  }
  .markdown-content ul {
    list-style-type: disc;
  }
  .markdown-content ol {
    list-style-type: decimal;
  }
  .markdown-content li {
    margin-bottom: 0.25em;
  }
  .markdown-content blockquote {
    border-left: 3px solid #d1d5db;
    padding-left: 1em;
    margin-left: 0;
    margin-bottom: 0.5em;
    color: #6b7280;
  }
  .markdown-content code {
    background-color: #f3f4f6;
    padding: 0.125em 0.25em;
    border-radius: 0.25em;
    font-size: 0.875em;
  }
  .dark .markdown-content code {
    background-color: #374151;
  }
  .markdown-content pre {
    background-color: #1f2937;
    color: #f9fafb;
    padding: 1em;
    border-radius: 0.5em;
    overflow-x: auto;
    margin-bottom: 0.5em;
  }
  .markdown-content pre code {
    background-color: transparent;
    padding: 0;
  }
  .markdown-content u {
    text-decoration: underline;
  }
`;
