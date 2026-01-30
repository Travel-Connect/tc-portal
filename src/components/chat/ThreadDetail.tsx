"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createReply, markThreadAsRead } from "@/lib/actions/chat";
import type { ChatMessageWithAuthor, Profile } from "@/types/database";

interface ThreadDetailProps {
  threadId: string;
  onClose: () => void;
}

export function ThreadDetail({ threadId, onClose }: ThreadDetailProps) {
  const [thread, setThread] = useState<ChatMessageWithAuthor | null>(null);
  const [replies, setReplies] = useState<ChatMessageWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // スレッドと返信を取得
  useEffect(() => {
    const fetchThread = async () => {
      setIsLoading(true);
      const supabase = createClient();

      // 親メッセージを取得
      const { data: threadData, error: threadError } = await supabase
        .from("chat_messages")
        .select(`
          *,
          profiles (id, email, display_name, role)
        `)
        .eq("id", threadId)
        .single();

      if (threadError) {
        console.error("Error fetching thread:", threadError);
        setIsLoading(false);
        return;
      }

      setThread(threadData);

      // 返信を取得
      const { data: repliesData, error: repliesError } = await supabase
        .from("chat_messages")
        .select(`
          *,
          profiles (id, email, display_name, role)
        `)
        .eq("parent_id", threadId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (repliesError) {
        console.error("Error fetching replies:", repliesError);
      } else {
        setReplies(repliesData || []);
      }

      // 既読をマーク
      await markThreadAsRead(threadId);

      setIsLoading(false);
    };

    fetchThread();
  }, [threadId]);

  // Realtime購読（返信）
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`thread:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `parent_id=eq.${threadId}`,
        },
        async (payload) => {
          const newReply = payload.new as ChatMessageWithAuthor;

          // プロフィール情報を取得
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", newReply.created_by)
            .single();

          const newMessage: ChatMessageWithAuthor = {
            ...newReply,
            profiles: profile as Profile | null,
          };
          setReplies((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  // 新しいメッセージが追加されたらスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const handleSubmit = async () => {
    // useRefで同期的に二重送信を防止
    if (!replyBody.trim() || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const result = await createReply(threadId, replyBody.trim());

    if (result.success && result.message) {
      // Realtimeで追加されるため、ここでは追加しない
      setReplyBody("");
    } else {
      console.error("Failed to create reply:", result.error);
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDisplayName = (message: ChatMessageWithAuthor) => {
    return message.profiles?.display_name || message.profiles?.email?.split("@")[0] || "不明";
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        スレッドが見つかりません
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">スレッド</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 親メッセージ */}
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-sm">{getDisplayName(thread)}</span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(thread.created_at)}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{thread.body}</p>
        </div>

        {/* 返信 */}
        {replies.length > 0 && (
          <div className="border-l-2 border-muted pl-4 space-y-3">
            {replies.map((reply) => (
              <div key={reply.id} className="bg-background rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{getDisplayName(reply)}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(reply.created_at)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {reply.deleted_at ? (
                    <span className="text-muted-foreground italic">このメッセージは削除されました</span>
                  ) : (
                    reply.body
                  )}
                </p>
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 返信入力 */}
      <div className="p-4 border-t bg-muted/20">
        <div className="relative">
          <Textarea
            placeholder="返信を入力..."
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] pr-10 resize-none text-sm"
            disabled={isSubmitting}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 bottom-1 h-8 w-8"
            onClick={handleSubmit}
            disabled={!replyBody.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
