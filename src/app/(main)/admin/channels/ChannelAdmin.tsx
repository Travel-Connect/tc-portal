"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Save, X, Archive, ArchiveRestore } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { ChatChannel } from "@/types/database";
import { createChannel, updateChannel } from "@/lib/actions/chat";

interface ChannelAdminProps {
  initialChannels: ChatChannel[];
}

export function ChannelAdmin({ initialChannels }: ChannelAdminProps) {
  const [channels, setChannels] = useState(initialChannels);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formSlug, setFormSlug] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const handleAdd = () => {
    setIsAdding(true);
    setFormSlug("");
    setFormName("");
    setFormDescription("");
    setError(null);
  };

  const handleEdit = (channel: ChatChannel) => {
    setEditingId(channel.id);
    setFormName(channel.name);
    setFormDescription(channel.description || "");
    setError(null);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setError(null);
  };

  const handleSaveNew = () => {
    if (!formSlug.trim() || !formName.trim()) {
      setError("スラッグと名前は必須です");
      return;
    }

    startTransition(async () => {
      const result = await createChannel(
        formSlug.trim(),
        formName.trim(),
        formDescription.trim() || undefined
      );

      if (result.success && result.channel) {
        setChannels([...channels, result.channel]);
        setIsAdding(false);
        setError(null);
      } else {
        setError(result.error || "エラーが発生しました");
      }
    });
  };

  const handleSaveEdit = (id: string) => {
    if (!formName.trim()) {
      setError("名前は必須です");
      return;
    }

    startTransition(async () => {
      const result = await updateChannel(id, {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
      });

      if (result.success && result.channel) {
        setChannels(
          channels.map((c) => (c.id === id ? result.channel! : c))
        );
        setEditingId(null);
        setError(null);
      } else {
        setError(result.error || "エラーが発生しました");
      }
    });
  };

  const handleToggleArchive = (channel: ChatChannel) => {
    startTransition(async () => {
      const result = await updateChannel(channel.id, {
        is_archived: !channel.is_archived,
      });

      if (result.success && result.channel) {
        setChannels(
          channels.map((c) => (c.id === channel.id ? result.channel! : c))
        );
        setError(null);
      } else {
        setError(result.error || "エラーが発生しました");
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleAdd} disabled={isAdding || isPending}>
          <Plus className="w-4 h-4 mr-2" />
          チャンネルを追加
        </Button>
      </div>

      {isAdding && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">新規チャンネル</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-slug">スラッグ</Label>
                <Input
                  id="new-slug"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  placeholder="general, pricing, incident など"
                />
                <p className="text-xs text-muted-foreground">
                  URLに使用されます（英小文字とハイフンのみ）
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-name">表示名</Label>
                <Input
                  id="new-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="全体、料金関連、障害情報 など"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-description">説明（任意）</Label>
              <Textarea
                id="new-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="チャンネルの説明を入力..."
                className="min-h-[80px]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancel} disabled={isPending}>
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </Button>
              <Button onClick={handleSaveNew} disabled={isPending}>
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-4">
          <div className="space-y-2">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className={`flex items-start justify-between p-3 rounded-lg ${
                  channel.is_archived ? "bg-muted/30 opacity-60" : "bg-muted/50"
                }`}
              >
                {editingId === channel.id ? (
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">スラッグ（変更不可）</Label>
                        <Input
                          value={channel.slug}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">表示名</Label>
                        <Input
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">説明</Label>
                      <Textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="min-h-[60px]"
                      />
                    </div>
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(channel.id)}
                        disabled={isPending}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{channel.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {channel.slug}
                        </Badge>
                        {channel.is_archived && (
                          <Badge variant="secondary" className="text-xs">
                            アーカイブ済み
                          </Badge>
                        )}
                      </div>
                      {channel.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {channel.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(channel)}
                        disabled={isPending}
                        title="編集"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleArchive(channel)}
                        disabled={isPending}
                        title={channel.is_archived ? "復元" : "アーカイブ"}
                      >
                        {channel.is_archived ? (
                          <ArchiveRestore className="w-4 h-4" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {channels.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                チャンネルがありません
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
