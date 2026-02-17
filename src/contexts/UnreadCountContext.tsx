"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface UnreadCountContextType {
  count: number;
  increment: (n?: number) => void;
  decrement: (n?: number) => void;
  setCount: (n: number) => void;
  /** MessagesLayoutが選択中のチャンネルIDを設定（そのチャンネルはMessagesLayout側で処理） */
  setActiveChannelId: (channelId: string | null) => void;
}

const UnreadCountContext = createContext<UnreadCountContextType>({
  count: 0,
  increment: () => {},
  decrement: () => {},
  setCount: () => {},
  setActiveChannelId: () => {},
});

export function useUnreadCount() {
  return useContext(UnreadCountContext);
}

interface UnreadCountProviderProps {
  initialCount: number;
  children: React.ReactNode;
}

export function UnreadCountProvider({ initialCount, children }: UnreadCountProviderProps) {
  const [count, setCountState] = useState(initialCount);
  const activeChannelIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  // サーバーから新しいinitialCountが来たら同期
  useEffect(() => {
    setCountState(initialCount);
  }, [initialCount]);

  const increment = useCallback((n = 1) => {
    setCountState((prev) => prev + n);
  }, []);

  const decrement = useCallback((n = 1) => {
    setCountState((prev) => Math.max(0, prev - n));
  }, []);

  const setCount = useCallback((n: number) => {
    setCountState(Math.max(0, n));
  }, []);

  const setActiveChannelId = useCallback((channelId: string | null) => {
    activeChannelIdRef.current = channelId;
  }, []);

  // グローバルRealtime購読: 認証完了後に購読を開始
  useEffect(() => {
    const supabase = createClient();
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    // 認証セッション確立後にRealtime購読を開始
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return;
      currentUserIdRef.current = user.id;

      realtimeChannel = supabase
        .channel("global-unread")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
          },
          (payload) => {
            const msg = payload.new as { channel_id: string; parent_id: string | null; created_by: string };
            // 自分のメッセージはスキップ
            if (msg.created_by === currentUserIdRef.current) return;
            // 選択中チャンネルのメッセージはMessagesLayoutが処理するのでスキップ
            if (msg.channel_id === activeChannelIdRef.current) return;
            // 非選択チャンネルの新規メッセージ → サイドバーバッジ増加
            increment(1);
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [increment]);

  return (
    <UnreadCountContext.Provider value={{ count, increment, decrement, setCount, setActiveChannelId }}>
      {children}
    </UnreadCountContext.Provider>
  );
}
