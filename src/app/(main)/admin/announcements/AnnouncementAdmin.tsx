"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  unpublishAnnouncement,
  deleteAnnouncement,
} from "@/lib/actions/announcements";
import type { Announcement, AnnouncementStatus } from "@/types/database";

interface AnnouncementAdminProps {
  initialAnnouncements: Announcement[];
}

interface FormState {
  title: string;
  body: string;
  status: AnnouncementStatus;
}

const defaultForm: FormState = {
  title: "",
  body: "",
  status: "draft",
};

export function AnnouncementAdmin({ initialAnnouncements }: AnnouncementAdminProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    setIsAdding(true);
    setForm(defaultForm);
    setError(null);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      body: announcement.body,
      status: announcement.status,
    });
    setError(null);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setError(null);
  };

  const handleSaveNew = () => {
    if (!form.title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    if (!form.body.trim()) {
      setError("本文を入力してください");
      return;
    }

    startTransition(async () => {
      const result = await createAnnouncement({
        title: form.title.trim(),
        body: form.body.trim(),
        status: form.status,
      });

      if (result.success) {
        setIsAdding(false);
        setError(null);
        window.location.reload();
      } else {
        setError(result.error || "エラーが発生しました");
      }
    });
  };

  const handleSaveEdit = (id: string) => {
    if (!form.title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    if (!form.body.trim()) {
      setError("本文を入力してください");
      return;
    }

    startTransition(async () => {
      const result = await updateAnnouncement(id, {
        title: form.title.trim(),
        body: form.body.trim(),
        status: form.status,
      });

      if (result.success) {
        setAnnouncements(
          announcements.map((a) =>
            a.id === id
              ? {
                  ...a,
                  title: form.title.trim(),
                  body: form.body.trim(),
                  status: form.status,
                  published_at:
                    form.status === "published"
                      ? a.published_at || new Date().toISOString()
                      : null,
                }
              : a
          )
        );
        setEditingId(null);
        setError(null);
      } else {
        setError(result.error || "エラーが発生しました");
      }
    });
  };

  const handleTogglePublish = (announcement: Announcement) => {
    startTransition(async () => {
      const result =
        announcement.status === "published"
          ? await unpublishAnnouncement(announcement.id)
          : await publishAnnouncement(announcement.id);

      if (result.success) {
        setAnnouncements(
          announcements.map((a) =>
            a.id === announcement.id
              ? {
                  ...a,
                  status: announcement.status === "published" ? "draft" : "published",
                  published_at:
                    announcement.status === "published"
                      ? null
                      : new Date().toISOString(),
                }
              : a
          )
        );
      } else {
        setError(result.error || "エラーが発生しました");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("このお知らせを削除しますか？")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAnnouncement(id);

      if (result.success) {
        setAnnouncements(announcements.filter((a) => a.id !== id));
      } else {
        setError(result.error || "エラーが発生しました");
      }
    });
  };

  const renderForm = (onSave: () => void) => (
    <Card>
      <CardContent className="py-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">タイトル</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="お知らせのタイトル"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">本文</Label>
          <Textarea
            id="body"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="お知らせの内容"
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">ステータス</Label>
          <select
            id="status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as AnnouncementStatus })
            }
          >
            <option value="draft">下書き</option>
            <option value="published">公開</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button onClick={onSave} disabled={isPending}>
            保存
          </Button>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            キャンセル
          </Button>
        </div>
      </CardContent>
    </Card>
  );

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
          お知らせを追加
        </Button>
      </div>

      {isAdding && renderForm(handleSaveNew)}

      <Card>
        <CardContent className="py-4">
          <div className="space-y-3">
            {announcements.map((announcement) =>
              editingId === announcement.id ? (
                <div key={announcement.id}>
                  {renderForm(() => handleSaveEdit(announcement.id))}
                </div>
              ) : (
                <div
                  key={announcement.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    announcement.status === "draft" ? "bg-muted/30 opacity-70" : "bg-muted/50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{announcement.title}</span>
                      <Badge
                        variant={announcement.status === "published" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {announcement.status === "published" ? "公開" : "下書き"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {announcement.body}
                    </p>
                    {announcement.published_at && (
                      <span className="text-xs text-muted-foreground">
                        公開日: {new Date(announcement.published_at).toLocaleDateString("ja-JP")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTogglePublish(announcement)}
                      disabled={isPending}
                      title={announcement.status === "published" ? "非公開にする" : "公開する"}
                    >
                      {announcement.status === "published" ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(announcement)}
                      disabled={isPending}
                      title="編集"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(announcement.id)}
                      disabled={isPending}
                      title="削除"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            )}
            {announcements.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                お知らせがありません
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
