"use client";

import { useState, useCallback, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Tool } from "@/types/database";
import { isUrlRunConfig } from "@/types/database";

const MAX_URLS = 10;

interface MultiUrlDialogProps {
  tool: Tool;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MultiUrlDialog({
  tool,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: MultiUrlDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (value: boolean) => {
      if (isControlled && controlledOnOpenChange) {
        controlledOnOpenChange(value);
      } else {
        setInternalOpen(value);
      }
      if (!value) {
        setPopupBlocked(false);
      }
    },
    [isControlled, controlledOnOpenChange]
  );

  const urls = useMemo(
    () =>
      isUrlRunConfig(tool.run_config)
        ? tool.run_config.open_urls.slice(0, MAX_URLS)
        : [],
    [tool.run_config]
  );

  const totalUrls = isUrlRunConfig(tool.run_config)
    ? tool.run_config.open_urls.length
    : 0;

  const handleOpenAll = useCallback(() => {
    setPopupBlocked(false);
    let blocked = false;
    for (const url of urls) {
      // noopener を features 引数に渡すと仕様上 null が返るため、
      // ブロック検知には features なしで開く
      const w = window.open(url, "_blank");
      if (!w) {
        blocked = true;
      }
    }
    if (blocked) {
      setPopupBlocked(true);
    } else {
      setOpen(false);
    }
  }, [urls, setOpen]);

  const handleOpenSingle = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tool.name}</DialogTitle>
          <DialogDescription>
            {urls.length}件のURLを開きます
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <ul className="space-y-2 max-h-[300px] overflow-y-auto">
            {urls.map((url, i) => (
              <li key={i} className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline truncate text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenSingle(url);
                  }}
                  title={url}
                >
                  {url}
                </button>
              </li>
            ))}
          </ul>
          {totalUrls > MAX_URLS && (
            <p className="text-xs text-muted-foreground">
              ※ 最大{MAX_URLS}件まで表示しています（全{totalUrls}件）
            </p>
          )}
          {popupBlocked && (
            <div className="p-3 rounded-lg bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200 text-sm">
              ポップアップがブロックされました。ブラウザの設定を確認してください。
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button autoFocus onClick={handleOpenAll}>
            <ExternalLink className="w-4 h-4 mr-2" />
            一括で開く
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
