"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { dismissAnnouncement } from "@/lib/actions/announcements";
import { AnnouncementCard } from "./AnnouncementCard";
import type { Announcement } from "@/types/database";

interface AnnouncementListProps {
  announcements: Announcement[];
  dismissedIds: string[];
}

export function AnnouncementList({
  announcements,
  dismissedIds: initialDismissedIds,
}: AnnouncementListProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>(initialDismissedIds);
  const [showDismissed, setShowDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDismiss = (id: string) => {
    // Optimistic: 即座に非表示リストに追加
    setDismissedIds((prev) => [...prev, id]);

    startTransition(async () => {
      const result = await dismissAnnouncement(id);
      if (!result.success) {
        // 失敗した場合は元に戻す
        setDismissedIds(initialDismissedIds);
      }
    });
  };

  const visibleAnnouncements = showDismissed
    ? announcements
    : announcements.filter((a) => !dismissedIds.includes(a.id));

  const dismissedCount = announcements.filter((a) =>
    dismissedIds.includes(a.id)
  ).length;

  return (
    <div className="space-y-4">
      {dismissedCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDismissed(!showDismissed)}
          >
            {showDismissed
              ? "閉じたお知らせを非表示"
              : `閉じたお知らせも表示 (${dismissedCount})`}
          </Button>
        </div>
      )}

      {visibleAnnouncements.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          お知らせはありません
        </p>
      ) : (
        <div className="space-y-3">
          {visibleAnnouncements.map((announcement) => {
            const isDismissed = dismissedIds.includes(announcement.id);
            return (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onDismiss={isDismissed ? undefined : handleDismiss}
                isDismissing={isPending}
                showDismissed={isDismissed}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
