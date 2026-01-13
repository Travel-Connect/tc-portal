"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category } from "@/types/database";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/categories";

interface CategoryListProps {
  initialCategories: Category[];
}

export function CategoryList({ initialCategories }: CategoryListProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSortIndex, setFormSortIndex] = useState(0);

  const handleAdd = () => {
    setIsAdding(true);
    setFormName("");
    setFormSortIndex(categories.length + 1);
    setError(null);
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormName(category.name);
    setFormSortIndex(category.sort_index);
    setError(null);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setError(null);
  };

  const handleSaveNew = () => {
    if (!formName.trim()) {
      setError("カテゴリ名を入力してください");
      return;
    }

    startTransition(async () => {
      const result = await createCategory({
        name: formName.trim(),
        sort_index: formSortIndex,
      });

      if (result.success) {
        // Optimistically add to list
        const newCategory: Category = {
          id: crypto.randomUUID(),
          name: formName.trim(),
          sort_index: formSortIndex,
          created_at: new Date().toISOString(),
        };
        setCategories([...categories, newCategory].sort((a, b) => a.sort_index - b.sort_index));
        setIsAdding(false);
        setError(null);
      } else {
        setError(result.error || "エラーが発生しました");
      }
    });
  };

  const handleSaveEdit = (id: string) => {
    if (!formName.trim()) {
      setError("カテゴリ名を入力してください");
      return;
    }

    startTransition(async () => {
      const result = await updateCategory(id, {
        name: formName.trim(),
        sort_index: formSortIndex,
      });

      if (result.success) {
        setCategories(
          categories
            .map((c) =>
              c.id === id ? { ...c, name: formName.trim(), sort_index: formSortIndex } : c
            )
            .sort((a, b) => a.sort_index - b.sort_index)
        );
        setEditingId(null);
        setError(null);
      } else {
        setError(result.error || "エラーが発生しました");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("このカテゴリを削除しますか？")) return;

    startTransition(async () => {
      const result = await deleteCategory(id);

      if (result.success) {
        setCategories(categories.filter((c) => c.id !== id));
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
          カテゴリを追加
        </Button>
      </div>

      {isAdding && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">新規カテゴリ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">カテゴリ名</Label>
                <Input
                  id="new-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="カテゴリ名を入力"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-sort">表示順</Label>
                <Input
                  id="new-sort"
                  type="number"
                  value={formSortIndex}
                  onChange={(e) => setFormSortIndex(parseInt(e.target.value) || 0)}
                />
              </div>
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
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                {editingId === category.id ? (
                  <div className="flex-1 flex items-center gap-4">
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={formSortIndex}
                      onChange={(e) => setFormSortIndex(parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <div className="flex gap-1">
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
                        onClick={() => handleSaveEdit(category.id)}
                        disabled={isPending}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground w-8">
                        #{category.sort_index}
                      </span>
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(category)}
                        disabled={isPending}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(category.id)}
                        disabled={isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                カテゴリがありません
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
