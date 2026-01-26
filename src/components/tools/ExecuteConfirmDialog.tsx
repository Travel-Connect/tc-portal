"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Play, Loader2, ExternalLink, Monitor } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Tool, Machine } from "@/types/database";
import { TOOL_TYPE_LABELS } from "@/types/database";
import { createRun, createHelperRun } from "@/lib/actions/runs";
import { getEnabledMachines } from "@/lib/actions/machines";
import { generateHelperUrl, HELPER_SUCCESS_MESSAGES } from "@/lib/helper";

// localStorage key for default machine
const STORAGE_KEY_DEFAULT_MACHINE = "tcportal.default_machine_id";
// 自動選択を表す特別な値（空文字はRadix UIで問題が起きるため）
const AUTO_VALUE = "auto";

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

  // マシン選択用の状態
  const [enabledMachines, setEnabledMachines] = useState<Pick<Machine, "id" | "name" | "hostname" | "last_seen_at">[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>(AUTO_VALUE);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);

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
  const isQueue = tool.execution_mode === "queue";

  // ダイアログが開いたときにマシン一覧を取得（queue実行のみ）
  useEffect(() => {
    if (!open || !isQueue) return;

    const fetchMachines = async () => {
      setIsLoadingMachines(true);
      try {
        const response = await getEnabledMachines();
        if (response.success && response.machines) {
          setEnabledMachines(response.machines);

          // localStorageからデフォルトマシンを復元
          const savedMachineId = localStorage.getItem(STORAGE_KEY_DEFAULT_MACHINE);
          if (savedMachineId) {
            // 保存されたマシンが一覧に含まれる場合のみ設定
            const exists = response.machines.some(m => m.id === savedMachineId);
            if (exists) {
              setSelectedMachineId(savedMachineId);
            } else {
              setSelectedMachineId(AUTO_VALUE);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch machines:", error);
      } finally {
        setIsLoadingMachines(false);
      }
    };

    fetchMachines();
  }, [open, isQueue]);

  // マシン選択時にlocalStorageに保存
  const handleMachineChange = useCallback((value: string) => {
    setSelectedMachineId(value);
    if (value && value !== AUTO_VALUE) {
      localStorage.setItem(STORAGE_KEY_DEFAULT_MACHINE, value);
    } else {
      localStorage.removeItem(STORAGE_KEY_DEFAULT_MACHINE);
    }
  }, []);

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
      // Runner経由の実行: target_machine_id を渡す
      startTransition(async () => {
        // AUTO_VALUEまたは空の場合はnullを渡す（どのRunnerでも実行可能）
        const targetMachineId = (selectedMachineId && selectedMachineId !== AUTO_VALUE) ? selectedMachineId : null;
        const response = await createRun(tool.id, targetMachineId);
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
  }, [isHelper, tool, setOpen, selectedMachineId]);

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

  // マシンがオンラインかどうか判定（last_seen_at が2分以内）
  const isMachineOnline = (machine: Pick<Machine, "last_seen_at">) => {
    if (!machine.last_seen_at) return false;
    const lastSeen = new Date(machine.last_seen_at).getTime();
    const threshold = Date.now() - 2 * 60 * 1000;
    return lastSeen >= threshold;
  };

  // マシン表示名を生成
  const getMachineDisplayName = (machine: Pick<Machine, "id" | "name" | "hostname">) => {
    if (machine.hostname && machine.hostname !== machine.name) {
      return `${machine.name} (${machine.hostname})`;
    }
    return machine.name;
  };

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
        <div className="py-4 space-y-4">
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

          {/* Queue実行時のマシン選択 */}
          {isQueue && (
            <div className="space-y-2">
              <Label htmlFor="machine-select" className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                実行先PC（Runner）
              </Label>
              <Select
                value={selectedMachineId}
                onValueChange={handleMachineChange}
                disabled={isLoadingMachines}
              >
                <SelectTrigger id="machine-select">
                  <SelectValue placeholder={isLoadingMachines ? "読み込み中..." : "自動（最初に拾ったRunnerが実行）"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO_VALUE}>自動</SelectItem>
                  {enabledMachines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      <span className="flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full ${isMachineOnline(machine) ? "bg-green-500" : "bg-gray-300"}`} />
                        {getMachineDisplayName(machine)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {enabledMachines.length === 0 && !isLoadingMachines && (
                <p className="text-xs text-muted-foreground">
                  登録済みのRunnerがありません。「自動」で実行すると、次にオンラインになったRunnerが実行します。
                </p>
              )}
            </div>
          )}

          {isHelper && (
            <p className="text-xs text-muted-foreground">
              ※ TC Portal Helperが必要です。インストールされていない場合は起動できません。
            </p>
          )}
          {result && (
            <div className={`p-3 rounded-lg ${result.success ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"}`}>
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
