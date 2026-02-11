"use client";

import { useState, useCallback, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
}

// 内部コンポーネント：key propでsrc変更時に自動リセットされる
function ImageModalContent({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt?: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setRotation(0);
  }, []);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
        case "r":
        case "R":
          handleRotate();
          break;
        case "0":
          handleReset();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handleZoomIn, handleZoomOut, handleRotate, handleReset]);

  return (
    <>
      {/* ツールバー */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/50 rounded-lg p-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/20"
          onClick={handleZoomOut}
          title="縮小 (-)"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-white text-xs px-2 min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/20"
          onClick={handleZoomIn}
          title="拡大 (+)"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/20"
          onClick={handleRotate}
          title="回転 (R)"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/20"
          onClick={onClose}
          title="閉じる (Esc)"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 画像コンテナ */}
      <div
        className="flex items-center justify-center w-full h-full min-h-[50vh] overflow-auto p-8 cursor-move"
        onClick={onClose}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || "画像"}
          className={cn(
            "max-w-full max-h-[80vh] object-contain transition-transform duration-200",
            "select-none"
          )}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
      </div>

      {/* 操作ヒント */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/60 text-xs bg-black/50 px-3 py-1 rounded">
        クリックで閉じる / +/- でズーム / R で回転
      </div>
    </>
  );
}

export function ImageModal({ isOpen, onClose, src, alt }: ImageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden"
        onPointerDownOutside={onClose}
      >
        <VisuallyHidden>
          <DialogTitle>画像プレビュー</DialogTitle>
        </VisuallyHidden>
        {/* key propでsrc変更時にコンポーネントをリマウント */}
        <ImageModalContent key={src} src={src} alt={alt} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
