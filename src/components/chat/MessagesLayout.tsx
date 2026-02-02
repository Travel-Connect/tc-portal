"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChannelList } from "./ChannelList";
import { ThreadList } from "./ThreadList";
import { ThreadDetail } from "./ThreadDetail";
import type { ChatChannel, ChatThreadWithDetails, ChatTag, Profile } from "@/types/database";

interface MessagesLayoutProps {
  initialChannels: ChatChannel[];
}

export function MessagesLayout({ initialChannels }: MessagesLayoutProps) {
  const [channels] = useState<ChatChannel[]>(initialChannels);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    initialChannels[0]?.id || null
  );
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThreadWithDetails[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [allTags, setAllTags] = useState<ChatTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  // 全タグを取得
  useEffect(() => {
    const fetchTags = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("chat_tags")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching tags:", error);
      } else {
        setAllTags(data || []);
      }
    };

    fetchTags();
  }, []);

  // チャンネル選択時またはタグフィルタ変更時にスレッドを取得（検索はデバウンス）
  useEffect(() => {
    if (!selectedChannelId) return;

    const fetchThreads = async () => {
      setIsLoadingThreads(true);
      setSelectedThreadId(null);

      const supabase = createClient();

      // タグで絞り込む場合、対象スレッドIDを先に取得
      let threadIdsFromTags: string[] | null = null;
      if (selectedTagIds.length > 0) {
        const { data: taggedThreads } = await supabase
          .from("chat_thread_tags")
          .select("thread_id")
          .in("tag_id", selectedTagIds);

        if (taggedThreads && taggedThreads.length > 0) {
          threadIdsFromTags = [...new Set(taggedThreads.map((t) => t.thread_id))];
        } else {
          // タグ指定があるが該当なし → 空配列を返す
          setThreads([]);
          setIsLoadingThreads(false);
          return;
        }
      }

      let dbQuery = supabase
        .from("chat_messages")
        .select(`
          *,
          profiles (id, email, display_name, role)
        `)
        .eq("channel_id", selectedChannelId)
        .is("parent_id", null)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

      // タグで絞り込み
      if (threadIdsFromTags) {
        dbQuery = dbQuery.in("id", threadIdsFromTags);
      }

      // 本文検索（ILIKE）
      if (searchQuery.trim()) {
        dbQuery = dbQuery.ilike("body", `%${searchQuery.trim()}%`);
      }

      const { data, error } = await dbQuery;

      if (error) {
        console.error("Error fetching threads:", error);
        setThreads([]);
      } else {
        // 返信数を取得
        const threadIds = data?.map((t) => t.id) || [];
        if (threadIds.length > 0) {
          const { data: replies } = await supabase
            .from("chat_messages")
            .select("parent_id")
            .in("parent_id", threadIds)
            .is("deleted_at", null);

          const replyCountMap = new Map<string, number>();
          replies?.forEach((r) => {
            if (r.parent_id) {
              replyCountMap.set(r.parent_id, (replyCountMap.get(r.parent_id) || 0) + 1);
            }
          });

          setThreads(
            (data || []).map((t) => ({
              ...t,
              reply_count: replyCountMap.get(t.id) || 0,
            }))
          );
        } else {
          setThreads([]);
        }
      }

      setIsLoadingThreads(false);
    };

    // 検索クエリの場合はデバウンス
    const debounceTime = searchQuery.trim() ? 300 : 0;
    const timer = setTimeout(fetchThreads, debounceTime);
    return () => clearTimeout(timer);
  }, [selectedChannelId, selectedTagIds, searchQuery]);

  // Realtime購読
  useEffect(() => {
    if (!selectedChannelId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${selectedChannelId}`)
      // INSERT: 新規メッセージ
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${selectedChannelId}`,
        },
        async (payload) => {
          const newMessage = payload.new as ChatThreadWithDetails;

          // 親メッセージ（新規スレッド）の場合
          if (newMessage.parent_id === null) {
            // プロフィール情報を取得
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", newMessage.created_by)
              .single();

            const newThread: ChatThreadWithDetails = {
              ...newMessage,
              profiles: profile as Profile | null,
              reply_count: 0,
            };
            // 重複チェック（handleNewThreadと両方で追加されるのを防ぐ）
            setThreads((prev) => {
              if (prev.some((t) => t.id === newThread.id)) {
                return prev;
              }
              return [newThread, ...prev];
            });
          } else {
            // 返信の場合、スレッドの返信数を更新
            setThreads((prev) =>
              prev.map((t) =>
                t.id === newMessage.parent_id
                  ? { ...t, reply_count: (t.reply_count || 0) + 1 }
                  : t
              )
            );
          }
        }
      )
      // UPDATE: メッセージ編集・削除
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${selectedChannelId}`,
        },
        async (payload) => {
          const updatedMessage = payload.new as ChatThreadWithDetails;

          // 親メッセージ（スレッド）の更新
          if (updatedMessage.parent_id === null) {
            // プロフィール情報を取得
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", updatedMessage.created_by)
              .single();

            setThreads((prev) =>
              prev.map((t) =>
                t.id === updatedMessage.id
                  ? {
                      ...updatedMessage,
                      profiles: profile as Profile | null,
                      reply_count: t.reply_count,
                    }
                  : t
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChannelId]);

  const handleNewThread = (thread: ChatThreadWithDetails) => {
    // 重複チェック（Realtime購読と両方で追加されるのを防ぐ）
    setThreads((prev) => {
      if (prev.some((t) => t.id === thread.id)) {
        return prev;
      }
      return [thread, ...prev];
    });
  };

  return (
    <div className="flex h-full">
      {/* 左カラム: チャンネル一覧 */}
      <div className="w-56 border-r bg-muted/30 flex-shrink-0">
        <ChannelList
          channels={channels}
          selectedChannelId={selectedChannelId}
          onSelectChannel={setSelectedChannelId}
        />
      </div>

      {/* 中央カラム: スレッド一覧 */}
      <div className="w-80 border-r flex-shrink-0 flex flex-col">
        <ThreadList
          channelId={selectedChannelId}
          channelName={selectedChannel?.name}
          threads={threads}
          selectedThreadId={selectedThreadId}
          onSelectThread={setSelectedThreadId}
          onNewThread={handleNewThread}
          isLoading={isLoadingThreads}
          allTags={allTags}
          selectedTagIds={selectedTagIds}
          onTagFilterChange={setSelectedTagIds}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* 右カラム: スレッド詳細 */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedThreadId ? (
          <ThreadDetail
            threadId={selectedThreadId}
            onClose={() => setSelectedThreadId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            スレッドを選択してください
          </div>
        )}
      </div>
    </div>
  );
}
