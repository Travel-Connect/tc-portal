"use client";

import { useState, useRef } from "react";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createThread } from "@/lib/actions/chat";
import type { ChatThreadWithDetails } from "@/types/database";

interface ThreadListProps {
  channelId: string | null;
  channelName?: string;
  threads: ChatThreadWithDetails[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewThread: (thread: ChatThreadWithDetails) => void;
  isLoading: boolean;
}

export function ThreadList({
  channelId,
  channelName,
  threads,
  selectedThreadId,
  onSelectThread,
  onNewThread,
  isLoading,
}: ThreadListProps) {
  const [newThreadBody, setNewThreadBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async () => {
    // useRefで同期的に二重送信を防止
    if (!channelId || !newThreadBody.trim() || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const result = await createThread(channelId, newThreadBody.trim());

    if (result.success && result.thread) {
      onNewThread(result.thread);
      setNewThreadBody("");
    } else {
      console.error("Failed to create thread:", result.error);
    }

    setIsSubmitting(false);
    isSubmittingRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatDate = (dateString: string) => {
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

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="p-4 border-b">
        <h2 className="font-semibold">
          {channelName ? `# ${channelName}` : "チャンネルを選択"}
        </h2>
      </div>

      {/* 新規スレッド作成 */}
      {channelId && (
        <div className="p-3 border-b bg-muted/20">
          <div className="relative">
            <Textarea
              placeholder="新しいスレッドを作成..."
              value={newThreadBody}
              onChange={(e) => setNewThreadBody(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] pr-10 resize-none text-sm"
              disabled={isSubmitting}
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 bottom-1 h-8 w-8"
              onClick={handleSubmit}
              disabled={!newThreadBody.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Enter で送信 / Shift+Enter で改行
          </p>
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
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  onClick={() => onSelectThread(thread.id)}
                  className={cn(
                    "w-full text-left p-3 border-b transition-colors",
                    selectedThreadId === thread.id
                      ? "bg-accent"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium line-clamp-2 flex-1">
                      {thread.body}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(thread.created_at)}
                    </span>
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
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
