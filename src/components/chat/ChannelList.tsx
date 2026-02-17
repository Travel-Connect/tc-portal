"use client";

import { useState, memo } from "react";
import { Hash, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markAllChannelsAsRead } from "@/lib/actions/chat";
import type { ChatChannel } from "@/types/database";

interface ChannelListProps {
  channels: ChatChannel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  channelUnreadCounts?: Record<string, number>;
  onAllChannelsMarkedAsRead?: () => void;
}

export const ChannelList = memo(function ChannelList({
  channels,
  selectedChannelId,
  onSelectChannel,
  channelUnreadCounts = {},
  onAllChannelsMarkedAsRead,
}: ChannelListProps) {
  const [isMarkingGlobalAsRead, setIsMarkingGlobalAsRead] = useState(false);
  const activeChannels = channels.filter((c) => !c.is_archived);
  const totalUnread = Object.values(channelUnreadCounts).reduce((sum, c) => sum + c, 0);

  const handleMarkAllAsRead = async () => {
    if (isMarkingGlobalAsRead) return;

    setIsMarkingGlobalAsRead(true);
    const result = await markAllChannelsAsRead();

    if (result.success) {
      onAllChannelsMarkedAsRead?.();
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
        {totalUnread > 0 && (
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
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {activeChannels.map((channel) => {
            const unread = channelUnreadCounts[channel.id] || 0;
            return (
              <li key={channel.id}>
                <button
                  onClick={() => onSelectChannel(channel.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    selectedChannelId === channel.id
                      ? "bg-accent text-accent-foreground"
                      : unread > 0
                      ? "text-foreground font-semibold hover:bg-accent/50"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Hash className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate flex-1">{channel.name}</span>
                  {unread > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold"
                    >
                      {unread > 99 ? "99+" : unread}
                    </Badge>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
});
