"use client";

import { X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Announcement } from "@/types/database";

interface AnnouncementCardProps {
  announcement: Announcement;
  onDismiss?: (id: string) => void;
  isDismissing?: boolean;
  showDismissed?: boolean;
}

export function AnnouncementCard({
  announcement,
  onDismiss,
  isDismissing,
  showDismissed,
}: AnnouncementCardProps) {
  const publishedDate = announcement.published_at
    ? new Date(announcement.published_at).toLocaleDateString("ja-JP")
    : null;

  return (
    <Card className={`bg-yellow-50 border-yellow-200 ${showDismissed ? "opacity-50" : ""}`}>
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-yellow-800 truncate">
                {announcement.title}
              </p>
              {publishedDate && (
                <span className="text-xs text-yellow-600 whitespace-nowrap">
                  {publishedDate}
                </span>
              )}
            </div>
            <p className="text-sm text-yellow-700 whitespace-pre-wrap">
              {announcement.body}
            </p>
          </div>
          {onDismiss && !showDismissed && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-6 w-6 p-0 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100"
              onClick={() => onDismiss(announcement.id)}
              disabled={isDismissing}
              title="閉じる"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
