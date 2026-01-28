"use client";

import { useState, useTransition, useCallback } from "react";
import { Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteTool } from "@/lib/actions/tools";

interface DeleteToolDialogProps {
  toolId: string;
  toolName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteToolDialog({
  toolId,
  toolName,
  open,
  onOpenChange,
  onDeleted,
}: DeleteToolDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmText === toolName;

  const handleClose = useCallback(
    (value: boolean) => {
      onOpenChange(value);
      if (!value) {
        setConfirmText("");
        setError(null);
      }
    },
    [onOpenChange]
  );

  const handleDelete = useCallback(() => {
    if (!isConfirmed) return;

    startTransition(async () => {
      const result = await deleteTool(toolId);
      if (result.success) {
        handleClose(false);
        onDeleted?.();
      } else {
        setError(result.error || "削除に失敗しました");
      }
    });
  }, [isConfirmed, toolId, handleClose, onDeleted]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ツールを削除</DialogTitle>
          <DialogDescription>
            この操作は元に戻せません。実行履歴（runs）は保持されます。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="bg-muted rounded-lg p-4">
            <p className="font-medium">{toolName}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-name">
              削除するにはツール名 <span className="font-bold">{toolName}</span> を入力してください
            </Label>
            <Input
              id="confirm-name"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={toolName}
              autoComplete="off"
            />
          </div>
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isPending}>
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                削除中...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                削除する
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
