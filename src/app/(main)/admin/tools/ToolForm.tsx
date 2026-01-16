"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { ToolIcon } from "@/components/tools";
import type { Category, ToolType, IconMode } from "@/types/database";
import { TOOL_TYPE_OPTIONS } from "@/types/database";

export interface FormState {
  name: string;
  category_id: string;
  tool_type: ToolType;
  description: string;
  target: string;
  icon_mode: IconMode;
  icon_key: string;
  icon_path: string;
  paths: string; // folder_set用: 1行1パス
  tags: string[];
  pendingIconFile?: File | null;
}

interface ToolFormProps {
  form: FormState;
  setForm: (form: FormState) => void;
  categories: Category[];
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
  isNew: boolean;
}

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export function ToolForm({
  form,
  setForm,
  categories,
  onSave,
  onCancel,
  isPending,
  isNew,
}: ToolFormProps) {
  const [dragOver, setDragOver] = useState(false);
  const [iconError, setIconError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "PNG, JPEG, WebP形式のみ対応しています";
    }
    if (file.size > MAX_SIZE) {
      return "ファイルサイズは2MB以下にしてください";
    }
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setIconError(error);
      return;
    }

    setIconError(null);
    setForm({ ...form, icon_mode: "upload", pendingIconFile: file });

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, [form, setForm]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const clearPendingIcon = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setForm({ ...form, pendingIconFile: null });
    setIconError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const switchToLucide = (iconKey: string) => {
    clearPendingIcon();
    setForm({ ...form, icon_mode: "lucide", icon_key: iconKey, pendingIconFile: null });
  };

  // Determine what to show for icon preview
  const showUploadPreview = previewUrl || (form.icon_mode === "upload" && form.icon_path);

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="text-base">{isNew ? "新規ツール" : "ツール編集"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">ツール名 *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ツール名を入力"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">カテゴリ *</Label>
            <Select
              value={form.category_id}
              onValueChange={(v) => setForm({ ...form, category_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tool_type">種別 *</Label>
            <Select
              value={form.tool_type}
              onValueChange={(v) => setForm({ ...form, tool_type: v as ToolType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOOL_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target">ターゲット (URL/パス)</Label>
            <Input
              id="target"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
              placeholder="https://... または ファイルパス"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">説明</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="ツールの説明を入力"
            rows={3}
          />
        </div>
        {form.tool_type === "folder_set" && (
          <div className="space-y-2">
            <Label htmlFor="paths">フォルダパス（1行1パス）</Label>
            <Textarea
              id="paths"
              value={form.paths}
              onChange={(e) => setForm({ ...form, paths: e.target.value })}
              placeholder={"C:\\Users\\Documents\\Folder1\nC:\\Users\\Documents\\Folder2"}
              rows={5}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              複数のフォルダを同時に開きます。1行に1つのパスを入力してください。
            </p>
          </div>
        )}
        <div className="space-y-2">
          <Label>タグ</Label>
          <TagInput
            value={form.tags}
            onChange={(tags) => setForm({ ...form, tags })}
            placeholder="タグを入力（任意）"
          />
        </div>

        {/* アイコン選択 */}
        <div className="space-y-3">
          <Label>アイコン</Label>
          <div className="flex gap-4">
            {/* Lucideアイコン選択 */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">既存アイコン</p>
              <Select
                value={form.icon_mode === "lucide" ? form.icon_key : ""}
                onValueChange={switchToLucide}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="アイコン選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Folder">Folder</SelectItem>
                  <SelectItem value="Activity">Activity</SelectItem>
                  <SelectItem value="Calculator">Calculator</SelectItem>
                  <SelectItem value="BarChart3">BarChart3</SelectItem>
                  <SelectItem value="FileText">FileText</SelectItem>
                  <SelectItem value="Table">Table</SelectItem>
                  <SelectItem value="Workflow">Workflow</SelectItem>
                  <SelectItem value="Monitor">Monitor</SelectItem>
                  <SelectItem value="Globe">Globe</SelectItem>
                  <SelectItem value="Database">Database</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* アップロード */}
            <div className="space-y-2 flex-1">
              <p className="text-sm text-muted-foreground">画像アップロード</p>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {showUploadPreview ? (
                  <div className="flex items-center justify-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl || (form.icon_path ? `/api/storage/tool-icons/${form.icon_path}` : "")}
                      alt="アイコンプレビュー"
                      className="w-12 h-12 object-contain rounded border"
                    />
                    <div className="text-left">
                      <p className="text-sm font-medium">
                        {form.pendingIconFile?.name || "アップロード済み"}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-destructive hover:text-destructive"
                        onClick={clearPendingIcon}
                      >
                        <X className="w-3 h-3 mr-1" />
                        削除
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        ドラッグ＆ドロップ または クリックして選択
                      </span>
                    </div>
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPEG, WebP / 2MB以下 / 200×200px推奨（正方形）
              </p>
              {iconError && (
                <p className="text-xs text-destructive">{iconError}</p>
              )}
            </div>
          </div>

          {/* 現在のアイコンプレビュー */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-sm text-muted-foreground">現在のアイコン:</span>
            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
              {previewUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previewUrl} alt="" className="w-6 h-6 object-contain" />
              ) : (
                <ToolIcon
                  tool={{
                    icon_mode: form.icon_mode,
                    icon_key: form.icon_key || null,
                    icon_path: form.icon_path || null,
                  }}
                  className="w-5 h-5 text-muted-foreground"
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            キャンセル
          </Button>
          <Button onClick={onSave} disabled={isPending}>
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
