import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/queries/admin";
import { getAllChannels, getAllTags } from "@/lib/actions/chat";
import { ChannelAdmin } from "./ChannelAdmin";

export default async function ChannelsAdminPage() {
  // admin チェック
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect("/403");
  }

  const [channels, tags] = await Promise.all([
    getAllChannels(),
    getAllTags(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-6 h-6" />
        <h1 className="text-2xl font-bold">チャンネル管理</h1>
      </div>

      <ChannelAdmin initialChannels={channels} initialTags={tags} />
    </div>
  );
}
