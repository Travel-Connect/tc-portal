"use client";

import { useState } from "react";
import { Hash, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { markAllChannelsAsRead } from "@/lib/actions/chat";
import type { ChatChannel } from "@/types/database";

interface ChannelListProps {
  channels: ChatChannel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
}

export function ChannelList({
  channels,
  selectedChannelId,
  onSelectChannel,
}: ChannelListProps) {
  const [isMarkingGlobalAsRead, setIsMarkingGlobalAsRead] = useState(false);
  const activeChannels = channels.filter((c) => !c.is_archived);

  const handleMarkAllAsRead = async () => {
    if (isMarkingGlobalAsRead) return;

    setIsMarkingGlobalAsRead(true);
    const result = await markAllChannelsAsRead();

    if (result.success) {
      // ページをリロードして未読バッジを更新
      window.location.reload();
    } else {
      console.error("Failed to mark all channels as read:", result.error);
    }

    setIsMarkingGlobalAsRead(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            チャンネル
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllAsRead}
          disabled={isMarkingGlobalAsRead}
          className="w-full h-7 text-xs gap-1"
          title="全チャンネルの全スレッドを既読にする"
        >
          {isMarkingGlobalAsRead ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCheck className="h-3.5 w-3.5" />
          )}
          <span>全チャンネルを既読</span>
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {activeChannels.map((channel) => (
            <li key={channel.id}>
              <button
                onClick={() => onSelectChannel(channel.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  selectedChannelId === channel.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <Hash className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{channel.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
