"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateMessage, deleteMessage } from "@/lib/actions/chat";
import { AttachmentList } from "./FileUpload";
import type { ChatMessageWithAuthor } from "@/types/database";

interface MessageItemProps {
  message: ChatMessageWithAuthor;
  currentUserId: string;
  onUpdate?: (message: ChatMessageWithAuthor) => void;
  onDelete?: (messageId: string) => void;
  variant?: "thread" | "reply";
}

export function MessageItem({
  message,
  currentUserId,
  onUpdate,
  onDelete,
  variant = "reply",
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.body);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOwner = message.created_by === currentUserId;
  const isDeleted = !!message.deleted_at;
  const isEdited = !!message.updated_at && !isDeleted;

  // 編集モード開始時にフォーカス
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const getDisplayName = () => {
    return message.profiles?.display_name || message.profiles?.email?.split("@")[0] || "不明";
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleEdit = () => {
    setIsMenuOpen(false);
    setEditBody(message.body);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditBody(message.body);
  };

  const handleSaveEdit = async () => {
    if (!editBody.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await updateMessage(message.id, editBody.trim());

    if (result.success && result.message) {
      onUpdate?.(result.message);
      setIsEditing(false);
    } else {
      console.error("Failed to update message:", result.error);
    }

    setIsSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleDeleteClick = () => {
    setIsMenuOpen(false);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsSubmitting(true);
    const result = await deleteMessage(message.id);

    if (result.success) {
      onDelete?.(message.id);
      setIsDeleteDialogOpen(false);
    } else {
      console.error("Failed to delete message:", result.error);
    }

    setIsSubmitting(false);
  };

  // 削除済みメッセージ
  if (isDeleted) {
    return (
      <div className={variant === "thread" ? "bg-muted/30 rounded-lg p-4" : "bg-background rounded-lg p-3"}>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-muted-foreground">{getDisplayName()}</span>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(message.created_at)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground italic">
          このメッセージは削除されました
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={variant === "thread" ? "bg-muted/30 rounded-lg p-4" : "bg-background rounded-lg p-3"}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{getDisplayName()}</span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(message.created_at)}
            </span>
            {isEdited && (
              <span className="text-xs text-muted-foreground">(編集済み)</span>
            )}
          </div>

          {/* 編集/削除メニュー（自分のメッセージのみ） */}
          {isOwner && !isEditing && (
            <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-1" align="end">
                <button
                  onClick={handleEdit}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  編集
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  削除
                </button>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* メッセージ本文 / 編集モード */}
        {isEditing ? (
          <div className="mt-1">
            <Textarea
              ref={textareaRef}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] resize-none text-sm"
              disabled={isSubmitting}
            />
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={!editBody.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span className="ml-1">保存</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
                <span className="ml-1">キャンセル</span>
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                Enter で保存 / Esc でキャンセル
              </span>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{message.body}</p>
            {/* 添付ファイル一覧 */}
            {message.attachments && message.attachments.length > 0 && (
              <AttachmentList attachments={message.attachments} />
            )}
          </>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isSubmitting) {
              e.preventDefault();
              handleConfirmDelete();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>メッセージを削除</DialogTitle>
            <DialogDescription>
              このメッセージを削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
