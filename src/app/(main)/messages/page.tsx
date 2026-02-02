import { Suspense } from "react";
import { MessagesLayout } from "@/components/chat/MessagesLayout";
import { getChannels } from "@/lib/queries/chat";

export const metadata = {
  title: "メッセージ | TC Portal",
};

export default async function MessagesPage() {
  const channels = await getChannels();

  return (
    <div className="h-[calc(100vh-theme(spacing.20))] -m-6">
      <Suspense fallback={<div className="p-6">読み込み中...</div>}>
        <MessagesLayout initialChannels={channels} />
      </Suspense>
    </div>
  );
}
