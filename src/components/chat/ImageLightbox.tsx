"use client";

import { useEffect, useCallback } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
  downloadUrl?: string;
  fileName?: string;
}

export function ImageLightbox({
  src,
  alt,
  onClose,
  downloadUrl,
  fileName,
}: ImageLightboxProps) {
  // Escapeキーで閉じる
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    // スクロールを無効化
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* ヘッダー */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <span className="text-white text-sm truncate max-w-[60%]">
          {fileName || alt}
        </span>
        <div className="flex items-center gap-2">
          {downloadUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
            >
              <Download className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 画像 */}
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

interface ImageThumbnailProps {
  src: string;
  alt: string;
  className?: string;
  onRemove?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ImageThumbnail({
  src,
  alt,
  className = "",
  onRemove,
  disabled,
  isLoading,
}: ImageThumbnailProps) {
  return (
    <div className={`relative group ${className}`}>
      <img
        src={src}
        alt={alt}
        className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        </div>
      )}
      {onRemove && !disabled && !isLoading && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
