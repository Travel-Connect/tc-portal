import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, Clock, Monitor } from "lucide-react";
import { getTaskMonitors } from "@/lib/actions/task-monitor";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import type { TaskMonitor } from "@/types/database";

export default async function IncidentsPage() {
  const taskMonitors = await getTaskMonitors();

  const failedTasks = taskMonitors.filter((t) => t.last_status === "failed");
  const successTasks = taskMonitors.filter((t) => t.last_status === "success");
  const pendingTasks = taskMonitors.filter((t) => t.last_status === null);

  // 表示順: failed → success → pending
  const sortedTasks = [...failedTasks, ...successTasks, ...pendingTasks];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-6 h-6" />
        <h1 className="text-2xl font-bold">障害情報</h1>
      </div>

      {/* タスク監視セクション */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          <h2 className="text-lg font-semibold">タスク監視</h2>
          {failedTasks.length > 0 && (
            <Badge variant="destructive">{failedTasks.length}件の失敗</Badge>
          )}
        </div>

        {taskMonitors.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>監視対象のタスクはありません</p>
              <p className="text-sm mt-2">
                Python/BATスクリプトから /api/monitor/report に報告すると、ここに表示されます
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">状態</TableHead>
                    <TableHead>タスク名</TableHead>
                    <TableHead className="w-[60px]">種別</TableHead>
                    <TableHead className="w-[120px]">実行PC</TableHead>
                    <TableHead className="w-[140px]">最終実行</TableHead>
                    <TableHead className="w-[80px]">終了コード</TableHead>
                    <TableHead>メッセージ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTasks.map((task) => (
                    <TaskMonitorRow key={task.id} task={task} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* 手動障害セクション（将来用） */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">手動登録の障害</h2>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>登録された障害はありません</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function TaskMonitorRow({ task }: { task: TaskMonitor }) {
  const isFailed = task.last_status === "failed";
  const isSuccess = task.last_status === "success";
  const isPending = task.last_status === null;

  const timeAgo = task.last_finished_at
    ? formatDistanceToNow(new Date(task.last_finished_at), {
        addSuffix: true,
        locale: ja,
      })
    : "-";

  const kindLabel = task.kind === "python" ? "PY" : "BAT";
  const kindVariant = task.kind === "python" ? "default" : "outline";

  return (
    <TableRow className={isFailed ? "bg-destructive/5" : ""}>
      <TableCell>
        {isFailed && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            失敗
          </Badge>
        )}
        {isSuccess && (
          <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3" />
            成功
          </Badge>
        )}
        {isPending && (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            未実行
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium">{task.task_name}</div>
          <div className="text-xs text-muted-foreground font-mono">
            {task.task_key}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={kindVariant}>{kindLabel}</Badge>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {task.machine_name || "-"}
        </span>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="text-sm">{timeAgo}</div>
          {task.last_finished_at && (
            <div className="text-xs text-muted-foreground">
              {new Date(task.last_finished_at).toLocaleString("ja-JP")}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span
          className={`font-mono text-sm ${
            task.last_exit_code !== 0 && task.last_exit_code !== null
              ? "text-destructive"
              : ""
          }`}
        >
          {task.last_exit_code ?? "-"}
        </span>
      </TableCell>
      <TableCell>
        <span
          className={`text-sm ${
            isFailed ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {task.last_message ? (
            task.last_message.length > 50
              ? `${task.last_message.slice(0, 50)}...`
              : task.last_message
          ) : (
            "-"
          )}
        </span>
      </TableCell>
    </TableRow>
  );
}
