"use client";

import { useState, useMemo, useTransition } from "react";
import { Plus, Pencil, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import type { TaskMonitor, TaskKind } from "@/types/database";
import { createTaskMonitor, updateTaskMonitor } from "@/lib/actions/task-monitor";

interface MonitorListProps {
  initialMonitors: TaskMonitor[];
}

interface MonitorFormState {
  task_key: string;
  task_name: string;
  kind: TaskKind;
  machine_name: string;
  enabled: boolean;
}

const defaultForm: MonitorFormState = {
  task_key: "",
  task_name: "",
  kind: "bat",
  machine_name: "",
  enabled: true,
};

export function MonitorList({ initialMonitors }: MonitorListProps) {
  const [monitors, setMonitors] = useState(initialMonitors);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MonitorFormState>(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // フィルタ
  const [keyword, setKeyword] = useState("");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [filterEnabled, setFilterEnabled] = useState<string>("all");

  const filteredMonitors = useMemo(() => {
    return monitors.filter((m) => {
      const matchesKeyword =
        !keyword ||
        m.task_key.toLowerCase().includes(keyword.toLowerCase()) ||
        m.task_name.toLowerCase().includes(keyword.toLowerCase());
      const matchesKind = filterKind === "all" || m.kind === filterKind;
      const matchesEnabled =
        filterEnabled === "all" ||
        (filterEnabled === "enabled" && m.enabled) ||
        (filterEnabled === "disabled" && !m.enabled);
      return matchesKeyword && matchesKind && matchesEnabled;
    });
  }, [monitors, keyword, filterKind, filterEnabled]);

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setForm(defaultForm);
    setError(null);
  };

  const handleEdit = (monitor: TaskMonitor) => {
    setEditingId(monitor.id);
    setIsAdding(false);
    setForm({
      task_key: monitor.task_key,
      task_name: monitor.task_name,
      kind: monitor.kind as TaskKind,
      machine_name: monitor.machine_name || "",
      enabled: monitor.enabled,
    });
    setError(null);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setError(null);
  };

  const handleSaveNew = () => {
    if (!form.task_key.trim()) {
      setError("タスクキーを入力してください");
      return;
    }
    if (!form.task_name.trim()) {
      setError("タスク名を入力してください");
      return;
    }

    startTransition(async () => {
      const result = await createTaskMonitor({
        task_key: form.task_key.trim(),
        task_name: form.task_name.trim(),
        kind: form.kind,
        machine_name: form.machine_name.trim() || null,
        enabled: form.enabled,
      });

      if (result.success && result.id) {
        const newMonitor: TaskMonitor = {
          id: result.id,
          task_key: form.task_key.trim(),
          task_name: form.task_name.trim(),
          kind: form.kind,
          machine_name: form.machine_name.trim() || null,
          enabled: form.enabled,
          last_status: null,
          last_started_at: null,
          last_finished_at: null,
          last_exit_code: null,
          last_message: null,
          last_log_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setMonitors([newMonitor, ...monitors]);
        setIsAdding(false);
        setError(null);
      } else {
        setError(result.error || "エラーが発生しました");
      }
    });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    if (!form.task_name.trim()) {
      setError("タスク名を入力してください");
      return;
    }

    startTransition(async () => {
      const result = await updateTaskMonitor(editingId, {
        task_name: form.task_name.trim(),
        enabled: form.enabled,
      });

      if (result.success) {
        setMonitors(
          monitors.map((m) =>
            m.id === editingId
              ? { ...m, task_name: form.task_name.trim(), enabled: form.enabled, updated_at: new Date().toISOString() }
              : m
          )
        );
        setEditingId(null);
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

      {/* フィルタ＋追加ボタン */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="キーワード検索..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={filterKind} onValueChange={setFilterKind}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全種別</SelectItem>
            <SelectItem value="python">Python</SelectItem>
            <SelectItem value="bat">BAT</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEnabled} onValueChange={setFilterEnabled}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全状態</SelectItem>
            <SelectItem value="enabled">有効のみ</SelectItem>
            <SelectItem value="disabled">無効のみ</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleAdd} disabled={isAdding || isPending}>
          <Plus className="w-4 h-4 mr-2" />
          追加
        </Button>
      </div>

      {/* 追加フォーム */}
      {isAdding && (
        <MonitorForm
          form={form}
          setForm={setForm}
          onSave={handleSaveNew}
          onCancel={handleCancel}
          isPending={isPending}
          isNew
        />
      )}

      {/* 一覧テーブル */}
      <Card>
        <CardContent className="py-4">
          {filteredMonitors.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              監視対象がありません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タスクキー</TableHead>
                  <TableHead>タスク名</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>マシン</TableHead>
                  <TableHead>有効</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>最終実行</TableHead>
                  <TableHead className="w-[60px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMonitors.map((monitor) =>
                  editingId === monitor.id ? (
                    <TableRow key={monitor.id}>
                      <TableCell colSpan={8} className="p-2">
                        <MonitorForm
                          form={form}
                          setForm={setForm}
                          onSave={handleSaveEdit}
                          onCancel={handleCancel}
                          isPending={isPending}
                          isNew={false}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={monitor.id} className={!monitor.enabled ? "opacity-50" : ""}>
                      <TableCell className="font-mono text-sm">{monitor.task_key}</TableCell>
                      <TableCell>{monitor.task_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{monitor.kind}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {monitor.machine_name || "-"}
                      </TableCell>
                      <TableCell>
                        {monitor.enabled ? (
                          <Badge variant="default" className="bg-green-600">有効</Badge>
                        ) : (
                          <Badge variant="secondary">無効</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={monitor.last_status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {monitor.last_finished_at
                          ? formatDistanceToNow(new Date(monitor.last_finished_at), {
                              addSuffix: true,
                              locale: ja,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(monitor)}
                          disabled={isPending}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "success") {
    return <Badge className="bg-green-600">success</Badge>;
  }
  if (status === "failed") {
    return <Badge variant="destructive">failed</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground">未実行</Badge>;
}

interface MonitorFormProps {
  form: MonitorFormState;
  setForm: (form: MonitorFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
  isNew: boolean;
}

function MonitorForm({ form, setForm, onSave, onCancel, isPending, isNew }: MonitorFormProps) {
  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="text-base">{isNew ? "新規監視タスク" : "監視タスク編集"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>タスクキー *</Label>
            {isNew ? (
              <Input
                value={form.task_key}
                onChange={(e) => setForm({ ...form, task_key: e.target.value })}
                placeholder="nightly_import"
                className="font-mono"
              />
            ) : (
              <Input value={form.task_key} disabled className="font-mono bg-muted" />
            )}
          </div>
          <div className="space-y-2">
            <Label>タスク名 *</Label>
            <Input
              value={form.task_name}
              onChange={(e) => setForm({ ...form, task_name: e.target.value })}
              placeholder="ナイトリー取込"
            />
          </div>
          <div className="space-y-2">
            <Label>種別 *</Label>
            {isNew ? (
              <Select
                value={form.kind}
                onValueChange={(v) => setForm({ ...form, kind: v as TaskKind })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bat">BAT</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.kind} disabled className="bg-muted" />
            )}
          </div>
          <div className="space-y-2">
            <Label>マシン名</Label>
            {isNew ? (
              <Input
                value={form.machine_name}
                onChange={(e) => setForm({ ...form, machine_name: e.target.value })}
                placeholder="PC名（空でも可）"
              />
            ) : (
              <Input value={form.machine_name || "-"} disabled className="bg-muted" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="monitor-enabled"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className="w-4 h-4"
          />
          <Label htmlFor="monitor-enabled">有効</Label>
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
