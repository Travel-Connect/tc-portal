"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Play, Loader2, ExternalLink } from "lucide-react";
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
import { TOOL_TYPE_LABELS } from "@/types/database";
import { createRun, createHelperRun } from "@/lib/actions/runs";
import { generateHelperUrl, HELPER_SUCCESS_MESSAGES } from "@/lib/helper";

interface ExecuteConfirmDialogProps {
  tool: Tool;
  children: React.ReactNode;
  // 制御モード用（親から状態を管理する場合）
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ExecuteConfirmDialog({
  tool,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ExecuteConfirmDialogProps) {
  // 内部状態（制御モードでない場合に使用）
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // 制御モードかどうか
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = useCallback((value: boolean) => {
    if (isControlled && controlledOnOpenChange) {
      controlledOnOpenChange(value);
    } else {
      setInternalOpen(value);
    }
    // ダイアログを閉じるときにresultをリセット
    if (!value) {
      setResult(null);
    }
  }, [isControlled, controlledOnOpenChange]);

  // execution_mode で判定（tool_type ではなく execution_mode を正とする）
  const isHelper = tool.execution_mode === "helper";

  const handleExecute = useCallback(() => {
    setResult(null);

    if (isHelper) {
      // Helper起動: tcportal://を即時起動してから記録を作成
      const helperUrl = generateHelperUrl(tool);

      if (!helperUrl) {
        setResult({ success: false, message: "起動URLを生成できませんでした（ターゲット未設定）" });
        return;
      }

      // tcportal://を即時起動（ブロック回避のため同期で実行）
      window.location.href = helperUrl;

      // 成功メッセージを表示
      const message = HELPER_SUCCESS_MESSAGES[tool.tool_type] || "起動しました";
      setResult({ success: true, message });

      // 記録をfire-and-forgetで作成（await不要）
      startTransition(async () => {
        await createHelperRun(tool.id);
      });

      // 1秒後にダイアログを閉じる
      setTimeout(() => {
        setOpen(false);
      }, 1000);
    } else {
      // Runner経由の実行: 従来通り
      startTransition(async () => {
        const response = await createRun(tool.id);
        if (response.success) {
          setResult({ success: true, message: "実行依頼を送信しました" });
          // 成功後1秒でダイアログを閉じる
          setTimeout(() => {
            setOpen(false);
          }, 1000);
        } else {
          setResult({ success: false, message: response.error || "実行依頼に失敗しました" });
        }
      });
    }
  }, [isHelper, tool, setOpen]);

  // Enterキーで実行
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isPending && !result?.success) {
        e.preventDefault();
        handleExecute();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, isPending, result?.success, handleExecute]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>実行確認</DialogTitle>
          <DialogDescription>
            {isHelper
              ? "以下のツールをローカルで起動しますか？"
              : "以下のツールを実行しますか？"}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="bg-muted rounded-lg p-4">
            <p className="font-medium">{tool.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              種類: {TOOL_TYPE_LABELS[tool.tool_type]}
            </p>
            {tool.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {tool.description}
              </p>
            )}
          </div>
          {isHelper && (
            <p className="text-xs text-muted-foreground mt-3">
              ※ TC Portal Helperが必要です。インストールされていない場合は起動できません。
            </p>
          )}
          {result && (
            <div className={`mt-4 p-3 rounded-lg ${result.success ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"}`}>
              {result.message}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            キャンセル
          </Button>
          <Button onClick={handleExecute} disabled={isPending || result?.success}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isHelper ? "起動中..." : "送信中..."}
              </>
            ) : (
              <>
                {isHelper ? (
                  <ExternalLink className="w-4 h-4 mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isHelper ? "起動する" : "実行する"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
