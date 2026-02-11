"use client";

import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type { MessageFormat } from "@/types/database";
import { ImageModal } from "./ImageModal";

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
  /** メッセージの保存形式（デフォルト: markdown） */
  format?: MessageFormat;
}

/**
 * Markdown/HTML + カスタムHTML（<u>, <span data-*>, <mention>, <img>）をレンダリング
 * XSS対策としてDOMPurifyでサニタイズ
 * インライン画像のdata-attachment-idを署名URLに解決
 */
export function MarkdownRenderer({ content, className, format = "markdown" }: MarkdownRendererProps) {
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt?: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // サニタイズ済みHTML（画像URL解決前）
  const sanitizedHtml = useMemo(() => {
    if (!content) return "";

    let rawHtml: string;

    if (format === "html") {
      // HTMLフォーマット：そのまま使用
      rawHtml = content;
    } else {
      // Markdownフォーマット：パース（GFM有効）
      rawHtml = marked.parse(content, {
        gfm: true,
        breaks: true,
      }) as string;
    }

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
        // 画像（インライン画像対応）
        "img",
        // カスタムタグ
        "mention",
      ],
      ALLOWED_ATTR: [
        "href", "target", "rel",
        "data-color", "data-size", "data-user-id",
        // 画像用属性
        "src", "alt", "data-attachment-id", "data-object-path",
        "class",
      ],
      // リンクは新しいタブで開く
      ADD_ATTR: ["target"],
      // hrefのプロトコル制限（http, https, mailto のみ許可）
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });

    return cleanHtml;
  }, [content, format]);

  // 画像のattachment IDを抽出して署名URLを取得
  useEffect(() => {
    if (!sanitizedHtml || typeof window === "undefined") return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedHtml, "text/html");
    const images = doc.querySelectorAll("img[data-attachment-id]");

    const attachmentIds: string[] = [];
    images.forEach((img) => {
      const id = img.getAttribute("data-attachment-id");
      if (id && !imageUrls.has(id)) {
        attachmentIds.push(id);
      }
    });

    if (attachmentIds.length === 0) return;

    // 署名URLを並列取得
    Promise.all(
      attachmentIds.map(async (id) => {
        try {
          const res = await fetch(`/api/chat/attachments/${id}/preview`);
          if (res.ok) {
            const data = await res.json();
            return { id, url: data.url };
          }
          return { id, url: null };
        } catch {
          return { id, url: null };
        }
      })
    ).then((results) => {
      const newUrls = new Map(imageUrls);
      let updated = false;
      results.forEach(({ id, url }) => {
        if (url && !newUrls.has(id)) {
          newUrls.set(id, url);
          updated = true;
        }
      });
      if (updated) {
        setImageUrls(newUrls);
      }
    });
  }, [sanitizedHtml, imageUrls]);

  // 最終的なHTML（画像URL解決済み + クラス変換）
  const finalHtml = useMemo(() => {
    if (!sanitizedHtml) return "";

    // data属性をclassに変換 + 画像URL解決
    return convertDataAttributesToClasses(sanitizedHtml, imageUrls);
  }, [sanitizedHtml, imageUrls]);

  // 画像クリックハンドラ
  const handleImageClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      const img = target as HTMLImageElement;
      setSelectedImage({ src: img.src, alt: img.alt });
    }
  }, []);

  // 画像にクリックイベントを追加
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 全ての画像にクリックハンドラとカーソルスタイルを追加
    const images = container.querySelectorAll("img");
    images.forEach((img) => {
      img.style.cursor = "pointer";
      img.addEventListener("click", handleImageClick);
    });

    return () => {
      images.forEach((img) => {
        img.removeEventListener("click", handleImageClick);
      });
    };
  }, [finalHtml, handleImageClick]);

  return (
    <>
      <div
        ref={containerRef}
        className={`markdown-content ${className || ""}`}
        dangerouslySetInnerHTML={{ __html: finalHtml }}
      />
      {selectedImage && (
        <ImageModal
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          src={selectedImage.src}
          alt={selectedImage.alt}
        />
      )}
    </>
  );
}

/**
 * data-color, data-size属性をTailwindクラスに変換
 * <mention>タグにハイライトクラスを追加
 * インライン画像のsrcを署名URLに解決
 */
function convertDataAttributesToClasses(html: string, imageUrls: Map<string, string>): string {
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

  // インライン画像のsrcを署名URLに解決
  doc.querySelectorAll("img[data-attachment-id]").forEach((el) => {
    const attachmentId = el.getAttribute("data-attachment-id");
    if (attachmentId && imageUrls.has(attachmentId)) {
      el.setAttribute("src", imageUrls.get(attachmentId)!);
    }
    // 画像スタイルを追加
    el.classList.add("rounded", "max-w-full", "my-2", "inline-block");
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
  .markdown-content img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5em;
    margin: 0.5em 0;
  }
`;
