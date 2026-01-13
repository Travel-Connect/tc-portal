"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Archive, ArchiveRestore, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tool, Category, IconMode } from "@/types/database";
import { TOOL_TYPE_LABELS } from "@/types/database";
import { createTool, updateTool, archiveTool, uploadToolIcon } from "@/lib/actions/tools";
import { ToolIcon } from "@/components/tools";
import { ToolForm, type FormState } from "./ToolForm";

interface ToolWithCategory extends Tool {
  categories: Category | null;
}

interface ToolListProps {
  initialTools: ToolWithCategory[];
  categories: Category[];
}

const defaultForm: FormState = {
  name: "",
  category_id: "",
  tool_type: "url",
  description: "",
  target: "",
  icon_mode: "lucide",
  icon_key: "Folder",
};

export function ToolList({ initialTools, categories }: ToolListProps) {
  const [tools, setTools] = useState(initialTools);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);

  const filteredTools = tools.filter((t) => showArchived || !t.is_archived);

  const handleAdd = () => {
    setIsAdding(true);
    setForm(defaultForm);
    setError(null);
  };

  const handleEdit = (tool: ToolWithCategory) => {
    setEditingId(tool.id);
    setForm({
      name: tool.name,
      category_id: tool.category_id,
      tool_type: tool.tool_type,
      description: tool.description || "",
      target: tool.target || "",
      icon_mode: tool.icon_mode,
      icon_key: tool.icon_key || "Folder",
    });
    setError(null);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setError(null);
  };

  const handleSaveNew = () => {
    if (!form.name.trim()) {
      setError("ツール名を入力してください");
      return;
    }
    if (!form.category_id) {
      setError("カテゴリを選択してください");
      return;
    }

    startTransition(async () => {
      const result = await createTool({
        name: form.name.trim(),
        category_id: form.category_id,
        tool_type: form.tool_type,
        description: form.description.trim() || undefined,
        target: form.target.trim() || undefined,
        icon_mode: form.icon_mode,
        icon_key: form.icon_key || undefined,
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
    if (!form.name.trim()) {
      setError("ツール名を入力してください");
      return;
    }

    startTransition(async () => {
      const result = await updateTool(id, {
        name: form.name.trim(),
        category_id: form.category_id,
        tool_type: form.tool_type,
        description: form.description.trim() || undefined,
        target: form.target.trim() || undefined,
        icon_mode: form.icon_mode,
        icon_key: form.icon_key || undefined,
      });

      if (result.success) {
        setTools(
          tools.map((t) =>
            t.id === id
              ? {
                  ...t,
                  name: form.name.trim(),
                  category_id: form.category_id,
                  tool_type: form.tool_type,
                  description: form.description.trim() || null,
                  target: form.target.trim() || null,
                  icon_mode: form.icon_mode,
                  icon_key: form.icon_key || null,
                  categories: categories.find((c) => c.id === form.category_id) || null,
                }
              : t
          )
        );
        setEditingId(null);
        setError(null);
      } else {
        setError(result.error || "エラーが発生しました");
      }
    });
  };

  const handleArchive = (id: string, archived: boolean) => {
    startTransition(async () => {
      const result = await archiveTool(id, archived);

      if (result.success) {
        setTools(tools.map((t) => (t.id === id ? { ...t, is_archived: archived } : t)));
      } else {
        setError(result.error || "エラーが発生しました");
      }
    });
  };

  const handleIconUpload = async (toolId: string, file: File) => {
    startTransition(async () => {
      const result = await uploadToolIcon(toolId, file);

      if (result.success && result.iconPath) {
        setTools(
          tools.map((t) =>
            t.id === toolId
              ? { ...t, icon_mode: "upload" as IconMode, icon_path: result.iconPath || null }
              : t
          )
        );
      } else {
        setError(result.error || "アップロードに失敗しました");
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

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
        >
          {showArchived ? "アーカイブを非表示" : "アーカイブを表示"}
        </Button>
        <Button onClick={handleAdd} disabled={isAdding || isPending}>
          <Plus className="w-4 h-4 mr-2" />
          ツールを追加
        </Button>
      </div>

      {isAdding && (
        <ToolForm
          form={form}
          setForm={setForm}
          categories={categories}
          onSave={handleSaveNew}
          onCancel={handleCancel}
          isPending={isPending}
          isNew
        />
      )}

      <Card>
        <CardContent className="py-4">
          <div className="space-y-3">
            {filteredTools.map((tool) =>
              editingId === tool.id ? (
                <ToolForm
                  key={tool.id}
                  form={form}
                  setForm={setForm}
                  categories={categories}
                  onSave={() => handleSaveEdit(tool.id)}
                  onCancel={handleCancel}
                  isPending={isPending}
                  isNew={false}
                />
              ) : (
                <div
                  key={tool.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    tool.is_archived ? "bg-muted/30 opacity-60" : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                      <ToolIcon tool={tool} className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tool.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {TOOL_TYPE_LABELS[tool.tool_type]}
                        </Badge>
                        {tool.is_archived && (
                          <Badge variant="secondary" className="text-xs">
                            アーカイブ
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {tool.categories?.name || "カテゴリなし"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleIconUpload(tool.id, file);
                        }}
                        disabled={isPending}
                      />
                      <Button size="sm" variant="ghost" asChild disabled={isPending}>
                        <span>
                          <Upload className="w-4 h-4" />
                        </span>
                      </Button>
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(tool)}
                      disabled={isPending}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleArchive(tool.id, !tool.is_archived)}
                      disabled={isPending}
                      title={tool.is_archived ? "アーカイブ解除" : "アーカイブ"}
                    >
                      {tool.is_archived ? (
                        <ArchiveRestore className="w-4 h-4" />
                      ) : (
                        <Archive className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            )}
            {filteredTools.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {showArchived ? "ツールがありません" : "アクティブなツールがありません"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
