"use client";

import { useState, useEffect } from "react";
import { X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "tcportal-helper-guide-dismissed";

interface HelperGuideBannerProps {
  className?: string;
}

// localStorageの状態をチェックする関数（クライアントサイドのみ）
function getInitialVisibility(): boolean | null {
  if (typeof window === "undefined") return null;
  return !localStorage.getItem(STORAGE_KEY);
}

export function HelperGuideBanner({ className = "" }: HelperGuideBannerProps) {
  // null = 未確定, true = 表示, false = 非表示
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    // マウント後にlocalStorageをチェック
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage初期化は正当なユースケース
    setVisible(getInitialVisibility());
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  // 未確定または非表示の場合は何も表示しない
  if (visible !== true) {
    return null;
  }

  return (
    <div className={`bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Helper起動について
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            フォルダやExcelを開くとき、初回のみChromeの確認ダイアログが表示されます。
            「このタイプのリンクは常に関連付けられたアプリで開く」にチェックを入れると、次回から1クリックで起動できます。
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 flex-shrink-0"
          onClick={handleDismiss}
          title="閉じる"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
