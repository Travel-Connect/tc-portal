"use client";

import { useState, useTransition } from "react";
import { dismissAnnouncement } from "@/lib/actions/announcements";
import { AnnouncementCard } from "./AnnouncementCard";
import type { Announcement } from "@/types/database";

interface HomeAnnouncementsBannerClientProps {
  announcements: Announcement[];
}

export function HomeAnnouncementsBannerClient({
  announcements: initialAnnouncements,
}: HomeAnnouncementsBannerClientProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [isPending, startTransition] = useTransition();

  const handleDismiss = (id: string) => {
    // Optimistic: 即座にUIから消す
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));

    startTransition(async () => {
      const result = await dismissAnnouncement(id);
      if (!result.success) {
        // 失敗した場合は元に戻す
        setAnnouncements(initialAnnouncements);
      }
    });
  };

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {announcements.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          onDismiss={handleDismiss}
          isDismissing={isPending}
        />
      ))}
    </div>
  );
}
