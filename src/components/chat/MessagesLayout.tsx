"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChannelList } from "./ChannelList";
import { ThreadList } from "./ThreadList";
import { ThreadDetail } from "./ThreadDetail";
import { markThreadAsRead, getMentionableUsers } from "@/lib/actions/chat";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import type { ChatChannel, ChatThreadWithDetails, ChatTag, Profile, ThreadWithUnreadRow } from "@/types/database";

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [channelUnreadCounts, setChannelUnreadCounts] = useState<Record<string, number>>({});

  const { increment: incrementUnread, decrement: decrementUnread, setActiveChannelId } = useUnreadCount();

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  // 選択中チャンネルをContextに通知（グローバルRealtimeで重複スキップするため）
  useEffect(() => {
    setActiveChannelId(selectedChannelId);
    return () => setActiveChannelId(null);
  }, [selectedChannelId, setActiveChannelId]);

  // メンション用ユーザー一覧を取得
  useEffect(() => {
    getMentionableUsers().then(setUsers);
  }, []);

  // 現在のユーザーIDを取得
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchUser();
  }, []);

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

  // チャンネル別未読数を取得
  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    const fetchCounts = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_channel_unread_counts", {
        p_user_id: currentUserId,
      });
      if (cancelled || error) {
        if (error) console.error("Error fetching channel unread counts:", error);
        return;
      }
      const counts: Record<string, number> = {};
      for (const row of (data || []) as { channel_id: string; unread_count: number }[]) {
        counts[row.channel_id] = row.unread_count;
      }
      setChannelUnreadCounts(counts);
    };
    fetchCounts();
    return () => { cancelled = true; };
  }, [currentUserId]);

  // フォールバック: RPC未対応時の従来方式
  const fetchThreadsFallback = useCallback(async () => {
    if (!selectedChannelId) return;

    const supabase = createClient();

    let threadIdsFromTags: string[] | null = null;
    if (selectedTagIds.length > 0) {
      const { data: taggedThreads } = await supabase
        .from("chat_thread_tags")
        .select("thread_id")
        .in("tag_id", selectedTagIds);

      if (taggedThreads && taggedThreads.length > 0) {
        threadIdsFromTags = [...new Set(taggedThreads.map((t) => t.thread_id))];
      } else {
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

    if (threadIdsFromTags) {
      dbQuery = dbQuery.in("id", threadIdsFromTags);
    }

    if (searchQuery.trim()) {
      dbQuery = dbQuery.ilike("body", `%${searchQuery.trim()}%`);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error("Error fetching threads:", error);
      setThreads([]);
    } else {
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
            format: (t.format as "markdown" | "html") || "markdown",
            reply_count: replyCountMap.get(t.id) || 0,
            is_unread: true, // フォールバック時はすべて未読扱い
          }))
        );
      } else {
        setThreads([]);
      }
    }

    setIsLoadingThreads(false);
  }, [selectedChannelId, selectedTagIds, searchQuery]);

  // RPC関数を使用してスレッドを取得（タグフィルタ・検索対応）
  const fetchThreadsWithUnread = useCallback(async () => {
    if (!selectedChannelId || !currentUserId) return;

    setIsLoadingThreads(true);
    setSelectedThreadId(null);

    const supabase = createClient();

    // RPC関数でスレッドを取得
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_threads_with_unread",
      {
        p_channel_id: selectedChannelId,
        p_user_id: currentUserId,
        p_limit: 50,
      }
    );

    if (rpcError) {
      console.error("Error fetching threads with RPC:", rpcError);
      // フォールバック: 従来の方法で取得
      await fetchThreadsFallback();
      return;
    }

    let threadsData: ChatThreadWithDetails[] = (rpcData as ThreadWithUnreadRow[] || []).map((row) => ({
      id: row.id,
      channel_id: row.channel_id,
      parent_id: row.parent_id,
      body: row.body,
      format: (row.format as "markdown" | "html") || "markdown", // 既存メッセージはmarkdownがデフォルト
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      profiles: row.author_id
        ? {
            id: row.author_id,
            email: row.author_email || "",
            display_name: row.author_display_name,
            role: (row.author_role as "admin" | "member") || "member",
            created_at: "",
          }
        : null,
      reply_count: row.reply_count,
      last_activity_at: row.last_activity_at,
      unread_count: row.unread_count,
      is_unread: row.is_unread,
    }));

    // タグフィルタ
    if (selectedTagIds.length > 0) {
      const { data: taggedThreads } = await supabase
        .from("chat_thread_tags")
        .select("thread_id")
        .in("tag_id", selectedTagIds);

      if (taggedThreads && taggedThreads.length > 0) {
        const threadIdsFromTags = new Set(taggedThreads.map((t) => t.thread_id));
        threadsData = threadsData.filter((t) => threadIdsFromTags.has(t.id));
      } else {
        threadsData = [];
      }
    }

    // 本文検索（クライアント側フィルタ）
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      threadsData = threadsData.filter((t) =>
        t.body.toLowerCase().includes(query)
      );
    }

    setThreads(threadsData);
    // 選択中チャンネルの未読数をスレッドデータから同期（RPC間のずれ防止）
    const unreadInChannel = threadsData.filter((t) => t.is_unread && !t.deleted_at).length;
    setChannelUnreadCounts((prev) => ({ ...prev, [selectedChannelId]: unreadInChannel }));
    setIsLoadingThreads(false);
  }, [selectedChannelId, currentUserId, selectedTagIds, searchQuery, fetchThreadsFallback]);

  // チャンネル選択時またはタグフィルタ/検索変更時にスレッドを取得
  useEffect(() => {
    if (!selectedChannelId || !currentUserId) return;

    const debounceTime = searchQuery.trim() ? 300 : 0;
    const timer = setTimeout(fetchThreadsWithUnread, debounceTime);
    return () => clearTimeout(timer);
  }, [selectedChannelId, currentUserId, selectedTagIds, searchQuery, fetchThreadsWithUnread]);

  // Realtime購読（全チャンネルINSERT + 選択チャンネルUPDATE を1つに統合）
  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("chat-realtime")
      // INSERT: 全チャンネルの新規メッセージ（フィルタなし）
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          const newMessage = payload.new as ChatThreadWithDetails & { channel_id: string };
          const isOwnMessage = newMessage.created_by === currentUserId;

          // ── 非選択チャンネルのメッセージ → チャンネルバッジのみ更新 ──
          if (newMessage.channel_id !== selectedChannelId) {
            if (!isOwnMessage) {
              setChannelUnreadCounts((prev) => ({
                ...prev,
                [newMessage.channel_id]: (prev[newMessage.channel_id] || 0) + 1,
              }));
            }
            return;
          }

          // ── 選択中チャンネルのメッセージ → スレッド一覧・バッジ全更新 ──

          // 親メッセージ（新規スレッド）の場合
          if (newMessage.parent_id === null) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", newMessage.created_by)
              .single();

            const newThread: ChatThreadWithDetails = {
              ...newMessage,
              profiles: profile as Profile | null,
              reply_count: 0,
              last_activity_at: newMessage.created_at,
              unread_count: isOwnMessage ? 0 : 1,
              is_unread: !isOwnMessage,
            };
            setThreads((prev) => {
              if (prev.some((t) => t.id === newThread.id)) return prev;
              return [newThread, ...prev];
            });
            if (!isOwnMessage) {
              incrementUnread(1);
              setChannelUnreadCounts((prev) => ({
                ...prev,
                [selectedChannelId!]: (prev[selectedChannelId!] || 0) + 1,
              }));
            }
          } else {
            // 返信の場合
            setThreads((prev) =>
              prev.map((t) => {
                if (t.id === newMessage.parent_id) {
                  const isViewingThread = selectedThreadId === t.id;
                  const wasUnread = t.is_unread;
                  const nowUnread = isViewingThread || isOwnMessage ? t.is_unread : true;
                  if (!wasUnread && nowUnread) {
                    incrementUnread(1);
                    setChannelUnreadCounts((prev) => ({
                      ...prev,
                      [selectedChannelId!]: (prev[selectedChannelId!] || 0) + 1,
                    }));
                  }
                  return {
                    ...t,
                    reply_count: (t.reply_count || 0) + 1,
                    last_activity_at: newMessage.created_at,
                    is_unread: nowUnread,
                    unread_count: isViewingThread || isOwnMessage
                      ? t.unread_count
                      : (t.unread_count || 0) + 1,
                  };
                }
                return t;
              })
            );
            if (selectedThreadId === newMessage.parent_id) {
              markThreadAsRead(newMessage.parent_id);
            }
          }
        }
      )
      // UPDATE: 選択チャンネルのメッセージ編集・削除
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: selectedChannelId ? `channel_id=eq.${selectedChannelId}` : undefined,
        },
        async (payload) => {
          if (!selectedChannelId) return;
          const updatedMessage = payload.new as ChatThreadWithDetails;

          if (updatedMessage.parent_id === null) {
            if (updatedMessage.deleted_at) {
              setThreads((prev) => {
                const deleted = prev.find((t) => t.id === updatedMessage.id);
                if (deleted?.is_unread) {
                  decrementUnread(1);
                  setChannelUnreadCounts((p) => ({
                    ...p,
                    [selectedChannelId]: Math.max((p[selectedChannelId] || 0) - 1, 0),
                  }));
                }
                return prev.filter((t) => t.id !== updatedMessage.id);
              });
              setSelectedThreadId((prev) =>
                prev === updatedMessage.id ? null : prev
              );
              return;
            }

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
                      last_activity_at: t.last_activity_at,
                      unread_count: t.unread_count,
                      is_unread: t.is_unread,
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
  }, [selectedChannelId, selectedThreadId, currentUserId, incrementUnread, decrementUnread]);

  const handleNewThread = (thread: ChatThreadWithDetails) => {
    // 重複チェック
    setThreads((prev) => {
      if (prev.some((t) => t.id === thread.id)) {
        return prev;
      }
      return [{
        ...thread,
        last_activity_at: thread.created_at,
        unread_count: 0,
        is_unread: false, // 自分で作成したので既読
      }, ...prev];
    });
  };

  // スレッド詳細を閉じる（useCallbackでRef安定化）
  const handleCloseThread = useCallback(() => {
    setSelectedThreadId(null);
  }, []);

  // スレッド選択時に既読マーク & ローカル状態更新
  const handleSelectThread = async (threadId: string) => {
    setSelectedThreadId(threadId);
    // 未読だった場合、サイドバーバッジ & チャンネルバッジをデクリメント
    const thread = threads.find((t) => t.id === threadId);
    if (thread?.is_unread) {
      decrementUnread(1);
      if (selectedChannelId) {
        setChannelUnreadCounts((prev) => ({
          ...prev,
          [selectedChannelId]: Math.max((prev[selectedChannelId] || 0) - 1, 0),
        }));
      }
    }
    // ローカル状態を即座に更新
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? { ...t, is_unread: false, unread_count: 0 }
          : t
      )
    );
  };

  // チャンネル内全既読後のバッジ更新ハンドラ
  const handleAllMarkedAsRead = () => {
    const unreadInChannel = threads.filter((t) => t.is_unread).length;
    decrementUnread(unreadInChannel);
    if (selectedChannelId) {
      setChannelUnreadCounts((prev) => ({ ...prev, [selectedChannelId]: 0 }));
    }
    setThreads((prev) => prev.map((t) => ({ ...t, is_unread: false, unread_count: 0 })));
  };

  // 全チャンネル既読後のハンドラ
  const handleAllChannelsMarkedAsRead = () => {
    const totalUnread = Object.values(channelUnreadCounts).reduce((sum, c) => sum + c, 0);
    decrementUnread(totalUnread);
    setChannelUnreadCounts({});
    setThreads((prev) => prev.map((t) => ({ ...t, is_unread: false, unread_count: 0 })));
  };

  return (
    <div className="flex h-full">
      {/* 左カラム: チャンネル一覧 */}
      <div className="w-56 border-r bg-muted/30 flex-shrink-0">
        <ChannelList
          channels={channels}
          selectedChannelId={selectedChannelId}
          onSelectChannel={setSelectedChannelId}
          channelUnreadCounts={channelUnreadCounts}
          onAllChannelsMarkedAsRead={handleAllChannelsMarkedAsRead}
        />
      </div>

      {/* 中央カラム: スレッド一覧 */}
      <div className="w-80 border-r flex-shrink-0 flex flex-col">
        <ThreadList
          channelId={selectedChannelId}
          channelName={selectedChannel?.name}
          threads={threads}
          selectedThreadId={selectedThreadId}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
          onAllMarkedAsRead={handleAllMarkedAsRead}
          isLoading={isLoadingThreads}
          allTags={allTags}
          selectedTagIds={selectedTagIds}
          onTagFilterChange={setSelectedTagIds}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          users={users}
        />
      </div>

      {/* 右カラム: スレッド詳細 */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedThreadId ? (
          <ThreadDetail
            threadId={selectedThreadId}
            onClose={handleCloseThread}
            onThreadDeleted={() => {
              // スレッド一覧から削除 (Realtimeでも処理されるがoptimistic)
              setThreads((prev) => prev.filter((t) => t.id !== selectedThreadId));
              setSelectedThreadId(null);
            }}
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
