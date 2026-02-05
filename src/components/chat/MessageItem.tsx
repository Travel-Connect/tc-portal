"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Pencil, Trash2, Loader2, Check, X, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { updateMessage, deleteMessage, toggleReaction } from "@/lib/actions/chat";
import { AttachmentList } from "./FileUpload";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { ChatMessageWithAuthor, ReactionSummary, ReactionEmoji } from "@/types/database";
import { REACTION_EMOJIS } from "@/types/database";

interface MessageItemProps {
  message: ChatMessageWithAuthor;
  currentUserId: string;
  onUpdate?: (message: ChatMessageWithAuthor) => void;
  onDelete?: (messageId: string) => void;
  onReactionChange?: (messageId: string, reactions: ReactionSummary[]) => void;
  variant?: "thread" | "reply";
  /**
   * 連続投稿グループの位置
   * - "first": グループの最初（アバター・名前表示）
   * - "middle": グループの中間（アバター・名前非表示）
   * - "last": グループの最後（アバター・名前非表示）
   * - "single": 単独メッセージ（アバター・名前表示）
   */
  groupPosition?: "first" | "middle" | "last" | "single";
}

// アバターの背景色をユーザーIDから決定
function getAvatarColor(userId: string | null): string {
  if (!userId) return "bg-gray-400";
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];
  const hash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// イニシャルを取得
function getInitials(displayName: string | null, email: string | null): string {
  if (displayName) {
    const firstChar = displayName.charAt(0);
    if (/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/.test(firstChar)) {
      return firstChar;
    }
    const words = displayName.split(/\s+/);
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return "??";
}

export function MessageItem({
  message,
  currentUserId,
  onUpdate,
  onDelete,
  onReactionChange,
  variant = "reply",
  groupPosition = "single",
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.body);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOwner = message.created_by === currentUserId;
  const isDeleted = !!message.deleted_at;
  const isEdited = !!message.updated_at && !isDeleted;
  const showAvatar = groupPosition === "first" || groupPosition === "single";

  // propsのreactionsを使用
  const reactions = message.reactions || [];

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const displayName = message.profiles?.display_name || message.profiles?.email?.split("@")[0] || "不明";
  const email = message.profiles?.email || null;
  const initials = getInitials(message.profiles?.display_name || null, email);
  const avatarColor = getAvatarColor(message.created_by);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP", {
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

  // リアクション処理
  const handleReaction = async (emoji: ReactionEmoji) => {
    setIsReactionPickerOpen(false);
    const result = await toggleReaction(message.id, emoji);

    if (result.success) {
      // 新しいリアクション状態を計算して親に通知
      const existing = reactions.find((r) => r.emoji === emoji);
      let newReactions: ReactionSummary[];

      if (result.added) {
        if (existing) {
          newReactions = reactions.map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count + 1, hasReacted: true }
              : r
          );
        } else {
          newReactions = [...reactions, { emoji, count: 1, users: [], hasReacted: true }];
        }
      } else {
        if (existing && existing.count > 1) {
          newReactions = reactions.map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count - 1, hasReacted: false }
              : r
          );
        } else {
          newReactions = reactions.filter((r) => r.emoji !== emoji);
        }
      }

      // 親に通知して状態を更新
      onReactionChange?.(message.id, newReactions);
    }
  };

  // 削除済みメッセージ
  if (isDeleted) {
    return (
      <div
        className={cn(
          "flex gap-2",
          isOwner ? "flex-row-reverse" : "flex-row",
          !showAvatar && (isOwner ? "pr-10" : "pl-10")
        )}
      >
        {showAvatar && (
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 opacity-50",
              avatarColor
            )}
          >
            {initials}
          </div>
        )}
        <div className={cn("max-w-[70%]", isOwner ? "items-end" : "items-start")}>
          {showAvatar && (
            <div className={cn("text-xs text-muted-foreground mb-1", isOwner ? "text-right" : "text-left")}>
              {displayName}
            </div>
          )}
          <div className="bg-muted/50 rounded-lg px-3 py-2">
            <p className="text-sm text-muted-foreground italic">このメッセージは削除されました</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        data-testid="message-item"
        data-message-id={message.id}
        className={cn(
          "flex gap-2 group",
          isOwner ? "flex-row-reverse" : "flex-row",
          !showAvatar && (isOwner ? "pr-10" : "pl-10"),
          groupPosition === "middle" || groupPosition === "last" ? "mt-0.5" : "mt-3",
          groupPosition === "first" || groupPosition === "single" ? "mt-3" : ""
        )}
      >
        {/* アバター */}
        {showAvatar ? (
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0",
              avatarColor
            )}
          >
            {initials}
          </div>
        ) : (
          <div className="w-8 flex-shrink-0" />
        )}

        {/* メッセージコンテンツ */}
        <div className={cn("flex flex-col max-w-[70%]", isOwner ? "items-end" : "items-start")}>
          {/* 名前（グループの先頭のみ） */}
          {showAvatar && (
            <div className={cn("text-xs text-muted-foreground mb-1", isOwner ? "text-right" : "text-left")}>
              {displayName}
            </div>
          )}

          {/* 吹き出し */}
          <div className="relative">
            <div
              className={cn(
                "rounded-2xl px-4 py-2 relative",
                isOwner
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted rounded-bl-md",
                variant === "thread" && "bg-muted/50"
              )}
            >
              {/* 編集モード */}
              {isEditing ? (
                <div className="min-w-[200px]">
                  <Textarea
                    ref={textareaRef}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[60px] resize-none text-sm bg-background text-foreground"
                    disabled={isSubmitting}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="secondary"
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
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <MarkdownRenderer
                    content={message.body}
                    className={cn("text-sm", isOwner && "text-primary-foreground [&_a]:text-primary-foreground [&_a]:underline")}
                  />
                  {message.attachments && message.attachments.length > 0 && (
                    <AttachmentList attachments={message.attachments} />
                  )}
                </>
              )}

              {/* 時刻と編集済みマーク */}
              {!isEditing && (
                <div
                  className={cn(
                    "text-[10px] mt-1 flex items-center gap-1",
                    isOwner ? "text-primary-foreground/70 justify-end" : "text-muted-foreground justify-start"
                  )}
                >
                  {isEdited && <span>(編集済み)</span>}
                  <span>{formatTime(message.created_at)}</span>
                </div>
              )}
            </div>

            {/* ホバーアクション（編集/削除/リアクション） */}
            {!isEditing && (
              <div
                className={cn(
                  "absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                  isOwner ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"
                )}
              >
                {/* リアクション追加ボタン */}
                <Popover open={isReactionPickerOpen} onOpenChange={setIsReactionPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="reaction-add-button">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align={isOwner ? "start" : "end"}>
                    <div className="flex gap-1">
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(emoji)}
                          className="text-lg hover:bg-muted rounded p-1 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 編集/削除メニュー */}
                {isOwner && (
                  <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="message-menu-button">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-32 p-1" align={isOwner ? "start" : "end"}>
                      <button
                        onClick={handleEdit}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted"
                        data-testid="message-edit-button"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        編集
                      </button>
                      <button
                        onClick={handleDeleteClick}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-destructive"
                        data-testid="message-delete-button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        削除
                      </button>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )}
          </div>

          {/* リアクション表示 */}
          {reactions.length > 0 && (
            <div className={cn("flex flex-wrap gap-1 mt-1", isOwner ? "justify-end" : "justify-start")}>
              {reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => handleReaction(reaction.emoji as ReactionEmoji)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                    reaction.hasReacted
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted hover:bg-muted/80"
                  )}
                  data-testid="reaction-chip"
                  data-emoji={reaction.emoji}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
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

/**
 * メッセージをグループ化するユーティリティ
 * 同一ユーザーが5分以内に連続投稿した場合にグループ化
 */
export function groupMessages(
  messages: ChatMessageWithAuthor[]
): { message: ChatMessageWithAuthor; position: "first" | "middle" | "last" | "single" }[] {
  const result: { message: ChatMessageWithAuthor; position: "first" | "middle" | "last" | "single" }[] = [];
  const GROUP_THRESHOLD_MS = 5 * 60 * 1000; // 5分

  for (let i = 0; i < messages.length; i++) {
    const current = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];

    const sameUserAsPrev =
      prev &&
      prev.created_by === current.created_by &&
      new Date(current.created_at).getTime() - new Date(prev.created_at).getTime() < GROUP_THRESHOLD_MS;

    const sameUserAsNext =
      next &&
      next.created_by === current.created_by &&
      new Date(next.created_at).getTime() - new Date(current.created_at).getTime() < GROUP_THRESHOLD_MS;

    let position: "first" | "middle" | "last" | "single";

    if (!sameUserAsPrev && !sameUserAsNext) {
      position = "single";
    } else if (!sameUserAsPrev && sameUserAsNext) {
      position = "first";
    } else if (sameUserAsPrev && sameUserAsNext) {
      position = "middle";
    } else {
      position = "last";
    }

    result.push({ message: current, position });
  }

  return result;
}
