"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { createReply, markThreadAsRead, uploadAttachment, getMentionableUsers, getMessagesReactions } from "@/lib/actions/chat";
import { TagInput } from "./TagInput";
import { MessageItem, groupMessages } from "./MessageItem";
import { FileUpload } from "./FileUpload";
import { RichTextEditor } from "./RichTextEditor";
import type { ChatMessageWithAuthor, ChatTag, ChatAttachment, Profile, ReactionSummary } from "@/types/database";

interface ThreadDetailProps {
  threadId: string;
  onClose: () => void;
}

export function ThreadDetail({ threadId, onClose }: ThreadDetailProps) {
  const [thread, setThread] = useState<ChatMessageWithAuthor | null>(null);
  const [replies, setReplies] = useState<ChatMessageWithAuthor[]>([]);
  const [tags, setTags] = useState<ChatTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const isSubmittingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // メンション用ユーザー一覧を取得
  useEffect(() => {
    getMentionableUsers().then(setUsers);
  }, []);

  // スレッドと返信を取得
  useEffect(() => {
    const fetchThread = async () => {
      setIsLoading(true);
      const supabase = createClient();

      // 現在のユーザーIDを取得
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      // 親メッセージを取得
      const { data: threadData, error: threadError } = await supabase
        .from("chat_messages")
        .select(`
          *,
          profiles (id, email, display_name, role),
          chat_attachments (*)
        `)
        .eq("id", threadId)
        .single();

      if (threadError) {
        console.error("Error fetching thread:", threadError);
        setIsLoading(false);
        return;
      }

      // chat_attachments を attachments にマッピング
      const threadWithAttachments = {
        ...threadData,
        attachments: threadData.chat_attachments as ChatAttachment[] | undefined,
      };
      delete (threadWithAttachments as Record<string, unknown>).chat_attachments;

      setChannelId(threadData.channel_id);

      // タグを取得
      const { data: threadTags } = await supabase
        .from("chat_thread_tags")
        .select(`chat_tags (*)`)
        .eq("thread_id", threadId);

      setTags(
        threadTags?.map((t) => t.chat_tags as unknown as ChatTag).filter(Boolean) || []
      );

      // 返信を取得
      const { data: repliesData, error: repliesError } = await supabase
        .from("chat_messages")
        .select(`
          *,
          profiles (id, email, display_name, role),
          chat_attachments (*)
        `)
        .eq("parent_id", threadId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      let repliesWithAttachments: ChatMessageWithAuthor[] = [];
      if (repliesError) {
        console.error("Error fetching replies:", repliesError);
      } else {
        // chat_attachments を attachments にマッピング
        repliesWithAttachments = (repliesData || []).map((r) => ({
          ...r,
          attachments: r.chat_attachments as ChatAttachment[] | undefined,
        }));
        repliesWithAttachments.forEach((r) => {
          delete (r as unknown as Record<string, unknown>).chat_attachments;
        });
      }

      // リアクションを一括取得
      const allMessageIds = [threadId, ...repliesWithAttachments.map((r) => r.id)];
      const reactionsMap = await getMessagesReactions(allMessageIds);

      // リアクションをメッセージにマージ
      const threadWithReactions = {
        ...threadWithAttachments,
        reactions: reactionsMap.get(threadId) || [],
      };
      setThread(threadWithReactions);

      const repliesWithReactions = repliesWithAttachments.map((r) => ({
        ...r,
        reactions: reactionsMap.get(r.id) || [],
      }));
      setReplies(repliesWithReactions);

      // 既読をマーク
      await markThreadAsRead(threadId);

      setIsLoading(false);
    };

    fetchThread();
  }, [threadId]);

  // Realtime購読（返信のINSERT/UPDATE、親スレッドのUPDATE）
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`thread:${threadId}`)
      // 返信のINSERT
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
            reactions: [],
          };
          setReplies((prev) => [...prev, newMessage]);
        }
      )
      // 返信のUPDATE（編集・削除）
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `parent_id=eq.${threadId}`,
        },
        async (payload) => {
          const updatedReply = payload.new as ChatMessageWithAuthor;

          // プロフィール情報を取得
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", updatedReply.created_by)
            .single();

          setReplies((prev) =>
            prev.map((r) =>
              r.id === updatedReply.id
                ? { ...updatedReply, profiles: profile as Profile | null, reactions: r.reactions }
                : r
            )
          );
        }
      )
      // 親スレッドのUPDATE（編集・削除）
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `id=eq.${threadId}`,
        },
        async (payload) => {
          const updatedThread = payload.new as ChatMessageWithAuthor;

          // プロフィール情報を取得
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", updatedThread.created_by)
            .single();

          setThread((prev) => ({
            ...updatedThread,
            profiles: profile as Profile | null,
            reactions: prev?.reactions || [],
          }));
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
      // 添付ファイルをアップロード
      if (selectedFiles.length > 0 && channelId) {
        for (const file of selectedFiles) {
          await uploadAttachment(
            result.message.id,
            channelId,
            threadId,
            file
          );
        }
      }
      // Realtimeで追加されるため、ここでは追加しない
      setReplyBody("");
      setSelectedFiles([]);
    } else {
      console.error("Failed to create reply:", result.error);
    }

    setIsSubmitting(false);
    isSubmittingRef.current = false;
  };

  // リアクション変更ハンドラ
  const handleReactionChange = (messageId: string, newReactions: ReactionSummary[]) => {
    if (messageId === threadId) {
      setThread((prev) => prev ? { ...prev, reactions: newReactions } : null);
    } else {
      setReplies((prev) =>
        prev.map((r) => (r.id === messageId ? { ...r, reactions: newReactions } : r))
      );
    }
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

  // 返信をグループ化
  const groupedReplies = groupMessages(replies);

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
      <div className="flex-1 overflow-y-auto p-4">
        {/* 親メッセージ */}
        <MessageItem
          message={thread}
          currentUserId={currentUserId || ""}
          variant="thread"
          groupPosition="single"
          onUpdate={(updatedMessage) => setThread(updatedMessage)}
          onDelete={() => {
            // 親が削除されても表示は維持（削除済み表示に切り替わる）
            setThread((prev) => prev ? { ...prev, deleted_at: new Date().toISOString() } : null);
          }}
          onReactionChange={handleReactionChange}
        />

        {/* タグ（削除されていない場合のみ表示） */}
        {!thread.deleted_at && (
          <div className="mt-3 ml-10">
            <TagInput
              threadId={threadId}
              initialTags={tags}
              onTagsChange={setTags}
            />
          </div>
        )}

        {/* 返信 */}
        {groupedReplies.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-muted-foreground mb-2">
              {replies.length}件の返信
            </div>
            {groupedReplies.map(({ message, position }) => (
              <MessageItem
                key={message.id}
                message={message}
                currentUserId={currentUserId || ""}
                variant="reply"
                groupPosition={position}
                onUpdate={(updatedMessage) => {
                  setReplies((prev) =>
                    prev.map((r) => (r.id === updatedMessage.id ? updatedMessage : r))
                  );
                }}
                onDelete={(messageId) => {
                  // 削除済みに更新（リストからは削除しない）
                  setReplies((prev) =>
                    prev.map((r) =>
                      r.id === messageId ? { ...r, deleted_at: new Date().toISOString() } : r
                    )
                  );
                }}
                onReactionChange={handleReactionChange}
              />
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 返信入力 */}
      <div className="p-4 border-t bg-muted/20">
        <div className="space-y-2">
          <RichTextEditor
            value={replyBody}
            onChange={setReplyBody}
            onSubmit={handleSubmit}
            placeholder="返信を入力..."
            disabled={isSubmitting}
            isSubmitting={isSubmitting}
            users={users}
            minHeight={60}
            maxHeight={200}
            resizable={true}
            showToolbar={true}
            textareaRef={replyTextareaRef}
          />
          <FileUpload
            files={selectedFiles}
            onFilesChange={setSelectedFiles}
            disabled={isSubmitting}
            textareaRef={replyTextareaRef}
          />
        </div>
      </div>
    </div>
  );
}
