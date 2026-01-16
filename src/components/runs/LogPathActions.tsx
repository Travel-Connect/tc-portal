"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FolderOpen, Copy, Check } from "lucide-react";

interface LogPathActionsProps {
  logPath: string;
}

export function LogPathActions({ logPath }: LogPathActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleOpen = () => {
    // tcportal:// プロトコルでヘルパーを呼び出してファイルを開く
    const url = `tcportal://open_file?path=${encodeURIComponent(logPath)}`;
    window.location.href = url;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(logPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2"
        onClick={handleOpen}
        title="ログファイルを開く"
      >
        <FolderOpen className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2"
        onClick={handleCopy}
        title="パスをコピー"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-600" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </Button>
    </div>
  );
}
