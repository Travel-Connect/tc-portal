"use client";

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

export function ToolForm({
  form,
  setForm,
  categories,
  onSave,
  onCancel,
  isPending,
  isNew,
}: ToolFormProps) {
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
        <div className="space-y-2">
          <Label>アイコン</Label>
          <div className="flex items-center gap-4">
            <Select
              value={form.icon_mode === "lucide" ? form.icon_key : "upload"}
              onValueChange={(v) => {
                if (v === "upload") {
                  setForm({ ...form, icon_mode: "upload", icon_key: "" });
                } else {
                  setForm({ ...form, icon_mode: "lucide", icon_key: v });
                }
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
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
