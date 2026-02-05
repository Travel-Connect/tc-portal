"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Settings, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { createReply, markThreadAsRead, uploadAttachment, getMentionableUsers, getMessagesReactions, updateMessage, deleteMessage } from "@/lib/actions/chat";
import { TagInput } from "./TagInput";
import { MessageItem, groupMessages } from "./MessageItem";
import { FileUpload } from "./FileUpload";
import { WysiwygEditor, WysiwygEditorRef } from "./WysiwygEditor";
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
  // スレッドヘッダーの編集/削除用
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isHeaderEditDialogOpen, setIsHeaderEditDialogOpen] = useState(false);
  const [isHeaderDeleteDialogOpen, setIsHeaderDeleteDialogOpen] = useState(false);
  const [editThreadBody, setEditThreadBody] = useState("");
  const [isEditingThread, setIsEditingThread] = useState(false);
  const isSubmittingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyEditorRef = useRef<WysiwygEditorRef>(null);

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

  // 表示中のメッセージIDを追跡するref（Realtimeコールバック内で使用）
  const messageIdsRef = useRef<Set<string>>(new Set([threadId]));

  // repliesが変更されたらmessageIdsRefを更新
  useEffect(() => {
    const ids = new Set([threadId, ...replies.map((r) => r.id)]);
    messageIdsRef.current = ids;
  }, [threadId, replies]);

  // Realtime購読（返信のINSERT/UPDATE、親スレッドのUPDATE、リアクション、添付ファイル）
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
            attachments: [],
          };

          setReplies((prev) => {
            // 重複チェック（自分の投稿がRealtimeで再度来た場合）
            if (prev.some((r) => r.id === newReply.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
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
                ? { ...updatedReply, profiles: profile as Profile | null, reactions: r.reactions, attachments: r.attachments }
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
            attachments: prev?.attachments || [],
          }));
        }
      )
      // リアクションのINSERT（他ユーザーのリアクション追加を反映）
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_message_reactions",
        },
        async (payload) => {
          const newReaction = payload.new as {
            id: string;
            message_id: string;
            user_id: string;
            emoji: string;
          };

          // 自分のリアクションはoptimisticで処理済みなのでスキップ
          if (newReaction.user_id === currentUserId) {
            return;
          }

          // このスレッドのメッセージでない場合はスキップ
          if (!messageIdsRef.current.has(newReaction.message_id)) {
            return;
          }

          // ユーザー情報を取得
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, display_name")
            .eq("id", newReaction.user_id)
            .single();

          const updateReactions = (reactions: ReactionSummary[]): ReactionSummary[] => {
            const existing = reactions.find((r) => r.emoji === newReaction.emoji);
            if (existing) {
              return reactions.map((r) =>
                r.emoji === newReaction.emoji
                  ? {
                      ...r,
                      count: r.count + 1,
                      users: [...r.users, { id: newReaction.user_id, display_name: profile?.display_name || null }],
                    }
                  : r
              );
            } else {
              return [
                ...reactions,
                {
                  emoji: newReaction.emoji,
                  count: 1,
                  users: [{ id: newReaction.user_id, display_name: profile?.display_name || null }],
                  hasReacted: false,
                },
              ];
            }
          };

          if (newReaction.message_id === threadId) {
            setThread((prev) =>
              prev ? { ...prev, reactions: updateReactions(prev.reactions || []) } : null
            );
          } else {
            setReplies((prev) =>
              prev.map((r) =>
                r.id === newReaction.message_id
                  ? { ...r, reactions: updateReactions(r.reactions || []) }
                  : r
              )
            );
          }
        }
      )
      // リアクションのDELETE（他ユーザーのリアクション削除を反映）
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_message_reactions",
        },
        (payload) => {
          const deletedReaction = payload.old as {
            id: string;
            message_id: string;
            user_id: string;
            emoji: string;
          };

          // 自分のリアクションはoptimisticで処理済みなのでスキップ
          if (deletedReaction.user_id === currentUserId) {
            return;
          }

          // このスレッドのメッセージでない場合はスキップ
          if (!messageIdsRef.current.has(deletedReaction.message_id)) {
            return;
          }

          const updateReactions = (reactions: ReactionSummary[]): ReactionSummary[] => {
            return reactions
              .map((r) => {
                if (r.emoji !== deletedReaction.emoji) return r;
                const newCount = r.count - 1;
                if (newCount <= 0) return null;
                return {
                  ...r,
                  count: newCount,
                  users: r.users.filter((u) => u.id !== deletedReaction.user_id),
                };
              })
              .filter((r): r is ReactionSummary => r !== null);
          };

          if (deletedReaction.message_id === threadId) {
            setThread((prev) =>
              prev ? { ...prev, reactions: updateReactions(prev.reactions || []) } : null
            );
          } else {
            setReplies((prev) =>
              prev.map((r) =>
                r.id === deletedReaction.message_id
                  ? { ...r, reactions: updateReactions(r.reactions || []) }
                  : r
              )
            );
          }
        }
      )
      // 添付ファイルのINSERT（他ユーザーの添付も反映）
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_attachments",
        },
        (payload) => {
          const newAttachment = payload.new as ChatAttachment;

          // このスレッドのメッセージでない場合はスキップ
          if (!messageIdsRef.current.has(newAttachment.message_id)) {
            return;
          }

          if (newAttachment.message_id === threadId) {
            setThread((prev) =>
              prev
                ? {
                    ...prev,
                    attachments: [...(prev.attachments || []), newAttachment],
                  }
                : null
            );
          } else {
            setReplies((prev) =>
              prev.map((r) =>
                r.id === newAttachment.message_id
                  ? { ...r, attachments: [...(r.attachments || []), newAttachment] }
                  : r
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, currentUserId]);

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

  // スレッドヘッダーの編集ハンドラ
  const handleHeaderEdit = () => {
    setIsHeaderMenuOpen(false);
    if (thread) {
      setEditThreadBody(thread.body);
      setIsHeaderEditDialogOpen(true);
    }
  };

  const handleHeaderSaveEdit = async () => {
    if (!editThreadBody.trim() || isEditingThread) return;

    setIsEditingThread(true);
    const result = await updateMessage(threadId, editThreadBody.trim());

    if (result.success && result.message) {
      setThread(result.message);
      setIsHeaderEditDialogOpen(false);
    } else {
      console.error("Failed to update thread:", result.error);
    }

    setIsEditingThread(false);
  };

  // スレッドヘッダーの削除ハンドラ
  const handleHeaderDeleteClick = () => {
    setIsHeaderMenuOpen(false);
    setIsHeaderDeleteDialogOpen(true);
  };

  const handleHeaderConfirmDelete = async () => {
    setIsEditingThread(true);
    const result = await deleteMessage(threadId);

    if (result.success) {
      setThread((prev) => prev ? { ...prev, deleted_at: new Date().toISOString() } : null);
      setIsHeaderDeleteDialogOpen(false);
    } else {
      console.error("Failed to delete thread:", result.error);
    }

    setIsEditingThread(false);
  };

  // スレッド所有者かどうか
  const isThreadOwner = thread?.created_by === currentUserId;

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
        <div className="flex items-center gap-1">
          {/* スレッド所有者のみ編集/削除メニューを表示 */}
          {isThreadOwner && thread && !thread.deleted_at && (
            <Popover open={isHeaderMenuOpen} onOpenChange={setIsHeaderMenuOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-1" align="end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={handleHeaderEdit}
                  data-testid="thread-header-edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  編集
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                  onClick={handleHeaderDeleteClick}
                  data-testid="thread-header-delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  削除
                </Button>
              </PopoverContent>
            </Popover>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* スレッド編集ダイアログ */}
      <Dialog open={isHeaderEditDialogOpen} onOpenChange={setIsHeaderEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スレッドを編集</DialogTitle>
            <DialogDescription>
              スレッドの内容を編集します。
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editThreadBody}
            onChange={(e) => setEditThreadBody(e.target.value)}
            placeholder="メッセージを入力..."
            className="min-h-[100px]"
            disabled={isEditingThread}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsHeaderEditDialogOpen(false)}
              disabled={isEditingThread}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleHeaderSaveEdit}
              disabled={!editThreadBody.trim() || isEditingThread}
            >
              {isEditingThread ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* スレッド削除確認ダイアログ */}
      <Dialog open={isHeaderDeleteDialogOpen} onOpenChange={setIsHeaderDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スレッドを削除</DialogTitle>
            <DialogDescription>
              このスレッドを削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsHeaderDeleteDialogOpen(false)}
              disabled={isEditingThread}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleHeaderConfirmDelete}
              disabled={isEditingThread}
            >
              {isEditingThread ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <WysiwygEditor
            ref={replyEditorRef}
            value={replyBody}
            onChange={setReplyBody}
            onSubmit={handleSubmit}
            placeholder="返信を入力..."
            disabled={isSubmitting}
            isSubmitting={isSubmitting}
            minHeight={60}
            maxHeight={200}
            showToolbar={true}
            testId="reply-editor"
          />
          <FileUpload
            files={selectedFiles}
            onFilesChange={setSelectedFiles}
            disabled={isSubmitting}
            attachButtonTestId="reply-attach-button"
          />
        </div>
      </div>
    </div>
  );
}
