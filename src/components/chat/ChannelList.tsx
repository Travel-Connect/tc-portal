"use client";

import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const activeChannels = channels.filter((c) => !c.is_archived);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          チャンネル
        </h2>
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
