"use client";

import { useState, useRef } from "react";
import { MessageSquare, Loader2, X, Search, Tag, Filter, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { createThread, uploadAttachment, markAllThreadsAsRead } from "@/lib/actions/chat";
import { FileUpload } from "./FileUpload";
import { RichTextEditor } from "./RichTextEditor";
import type { ChatThreadWithDetails, ChatTag, Profile } from "@/types/database";

interface ThreadListProps {
  channelId: string | null;
  channelName?: string;
  threads: ChatThreadWithDetails[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewThread: (thread: ChatThreadWithDetails) => void;
  isLoading: boolean;
  allTags: ChatTag[];
  selectedTagIds: string[];
  onTagFilterChange: (tagIds: string[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  /** メンション候補となるユーザー一覧 */
  users?: Profile[];
}

export function ThreadList({
  channelId,
  channelName,
  threads,
  selectedThreadId,
  onSelectThread,
  onNewThread,
  isLoading,
  allTags,
  selectedTagIds,
  onTagFilterChange,
  searchQuery,
  onSearchChange,
  users = [],
}: ThreadListProps) {
  const [newThreadBody, setNewThreadBody] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);
  const isSubmittingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    // テキストまたは画像のどちらかが必要
    const hasContent = newThreadBody.trim() || selectedFiles.length > 0;
    if (!channelId || !hasContent || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const result = await createThread(channelId, newThreadBody.trim());

    if (result.success && result.thread) {
      // 添付ファイルをアップロード
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          await uploadAttachment(
            result.thread.id,
            channelId,
            result.thread.id, // 親スレッドなのでthread_idは自身のID
            file
          );
        }
      }
      onNewThread(result.thread);
      setNewThreadBody("");
      setSelectedFiles([]);
    } else {
      console.error("Failed to create thread:", result.error);
    }

    setIsSubmitting(false);
    isSubmittingRef.current = false;
  };

  const handleMarkAllAsRead = async () => {
    if (!channelId || isMarkingAllAsRead) return;

    setIsMarkingAllAsRead(true);
    const result = await markAllThreadsAsRead(channelId);

    if (result.success) {
      // ページをリロードして未読バッジを更新
      window.location.reload();
    } else {
      console.error("Failed to mark all threads as read:", result.error);
    }

    setIsMarkingAllAsRead(false);
  };


  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "昨日";
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
    }
  };

  const getDisplayName = (thread: ChatThreadWithDetails) => {
    return thread.profiles?.display_name || thread.profiles?.email?.split("@")[0] || "不明";
  };

  // タグフィルタ用のタグ一覧（検索でフィルタ）
  const filteredTags = allTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  // 選択中のタグ（表示用）
  const selectedTags = allTags.filter((tag) => selectedTagIds.includes(tag.id));
  const MAX_VISIBLE_TAGS = 3;
  const visibleSelectedTags = selectedTags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = selectedTags.length - MAX_VISIBLE_TAGS;

  // 未読スレッド数をカウント
  const unreadCount = threads.filter((t) => t.is_unread).length;

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">
          {channelName ? `# ${channelName}` : "チャンネルを選択"}
        </h2>
        {channelId && unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAllAsRead}
            className="h-7 text-xs gap-1"
            title="このチャンネルの全スレッドを既読にする"
          >
            {isMarkingAllAsRead ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            <span>チャンネルを既読</span>
          </Button>
        )}
      </div>

      {/* 検索バー */}
      {channelId && (
        <div className="px-3 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="スレッドを検索..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* タグフィルタ（Popover形式） */}
      {allTags.length > 0 && (
        <div className="px-3 py-2 border-b bg-muted/10 flex items-center gap-2 flex-wrap">
          <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                data-testid="tag-filter-trigger"
              >
                <Filter className="h-3 w-3" />
                タグで絞り込み
                {selectedTagIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {selectedTagIds.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="タグを検索..."
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    className="h-7 pl-7 text-xs"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredTags.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      タグが見つかりません
                    </p>
                  ) : (
                    filteredTags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <label
                          key={tag.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            id={`tag-filter-${tag.id}`}
                            aria-label={tag.name}
                            checked={isSelected}
                            onCheckedChange={(checked: boolean | "indeterminate") => {
                              if (checked === true) {
                                onTagFilterChange([...selectedTagIds, tag.id]);
                              } else {
                                onTagFilterChange(selectedTagIds.filter((id) => id !== tag.id));
                              }
                            }}
                          />
                          <span className="text-sm flex-1 truncate">{tag.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                {selectedTagIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => {
                      onTagFilterChange([]);
                      setIsTagPopoverOpen(false);
                    }}
                  >
                    すべてクリア
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* 選択中のタグをチップ表示 */}
          {visibleSelectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="default"
              className="text-xs pr-1 cursor-pointer"
              onClick={() => onTagFilterChange(selectedTagIds.filter((id) => id !== tag.id))}
              data-testid="tag-chip"
              data-tag-id={tag.id}
            >
              <Tag className="h-2.5 w-2.5 mr-1" />
              {tag.name}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          {hiddenTagCount > 0 && (
            <Badge variant="secondary" className="text-xs" data-testid="tag-overflow">
              +{hiddenTagCount}
            </Badge>
          )}
        </div>
      )}

      {/* 新規スレッド作成 */}
      {channelId && (
        <div className="p-3 border-b bg-muted/20">
          <div className="space-y-2" data-testid="thread-editor">
            <RichTextEditor
              value={newThreadBody}
              onChange={setNewThreadBody}
              onSubmit={handleSubmit}
              placeholder="新しいスレッドを作成..."
              disabled={isSubmitting}
              isSubmitting={isSubmitting}
              minHeight={60}
              maxHeight={200}
              showToolbar={false}
              users={users}
              textareaRef={textareaRef}
            />
            <FileUpload
              files={selectedFiles}
              onFilesChange={setSelectedFiles}
              disabled={isSubmitting}
              attachButtonTestId="thread-attach-button"
            />
          </div>
        </div>
      )}

      {/* スレッド一覧 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p className="text-sm">スレッドがありません</p>
          </div>
        ) : (
          <ul>
            {threads.map((thread) => {
              const isUnread = thread.is_unread;
              const unreadCount = thread.unread_count || 0;
              const displayDate = thread.last_activity_at || thread.created_at;

              return (
                <li key={thread.id}>
                  <button
                    onClick={() => onSelectThread(thread.id)}
                    className={cn(
                      "w-full text-left p-3 border-b transition-colors",
                      selectedThreadId === thread.id
                        ? "bg-accent"
                        : isUnread
                        ? "bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50"
                        : "hover:bg-muted/50"
                    )}
                    data-testid="thread-item"
                    data-thread-id={thread.id}
                    data-unread={isUnread}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-sm line-clamp-2 flex-1",
                        thread.deleted_at && "text-muted-foreground italic",
                        isUnread && !thread.deleted_at && "font-semibold"
                      )}>
                        {thread.deleted_at ? "[削除済み]" : thread.body}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(displayDate)}
                        </span>
                        {/* 未読バッジ */}
                        {isUnread && unreadCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold"
                            data-testid="unread-badge"
                          >
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {getDisplayName(thread)}
                      </span>
                      {(thread.reply_count || 0) > 0 && (
                        <span className="text-xs text-muted-foreground">
                          · {thread.reply_count} 件の返信
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
