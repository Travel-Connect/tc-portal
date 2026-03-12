import { Suspense } from "react";
import { MessagesLayout } from "@/components/chat/MessagesLayout";
import { getChannels } from "@/lib/queries/chat";
import { createPerfContext, measure, logPerfSummary } from "@/lib/perf/measure";

export const metadata = {
  title: "メッセージ | TC Portal",
};

export default async function MessagesPage() {
  const ctx = createPerfContext();

  const channels = await measure("messages.getChannels", () => getChannels(), ctx);

  logPerfSummary(ctx);

  return (
    <div className="h-[calc(100vh-theme(spacing.20))] -m-6">
      <Suspense fallback={<div className="p-6">読み込み中...</div>}>
        <MessagesLayout initialChannels={channels} />
      </Suspense>
    </div>
  );
}
