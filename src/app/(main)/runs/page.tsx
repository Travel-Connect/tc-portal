import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, ExternalLink, Clock, CheckCircle, XCircle, Loader2, Ban } from "lucide-react";
import { getRuns } from "@/lib/queries/runs";
import { getEnabledMachines } from "@/lib/actions/machines";
import { LogPathActions } from "@/components/runs/LogPathActions";
import { RunnerStatusPanel } from "@/components/runs/RunnerStatusPanel";
import type { RunStatus } from "@/types/database";

// ステータスの日本語ラベルとスタイル
const STATUS_CONFIG: Record<RunStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ElementType }> = {
  queued: { label: "待機中", variant: "secondary", icon: Clock },
  running: { label: "実行中", variant: "default", icon: Loader2 },
  success: { label: "成功", variant: "outline", icon: CheckCircle },
  failed: { label: "失敗", variant: "destructive", icon: XCircle },
  canceled: { label: "キャンセル", variant: "secondary", icon: Ban },
};

function formatDateTime(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function RunsPage() {
  const [runs, machinesResult] = await Promise.all([
    getRuns(100),
    getEnabledMachines(),
  ]);
  const machines = machinesResult.machines || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <History className="w-6 h-6" />
        <h1 className="text-2xl font-bold">実行履歴</h1>
      </div>

      <RunnerStatusPanel machines={machines} />

      <Card>
        <CardHeader>
          <CardTitle>最近の実行</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length > 0 ? (
            <div className="space-y-4">
              {/* テーブルヘッダー */}
              <div className="grid grid-cols-7 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div>ステータス</div>
                <div>ツール名</div>
                <div>実行者</div>
                <div>開始時刻</div>
                <div>終了時刻</div>
                <div>詳細</div>
                <div>ログ</div>
              </div>

              {/* データ行 */}
              {runs.map((run) => {
                const statusConfig = STATUS_CONFIG[run.status];
                const StatusIcon = statusConfig.icon;
                return (
                  <div key={run.id} data-testid={`run-row-${run.id}`} className="grid grid-cols-7 gap-4 text-sm py-2 border-b last:border-0 items-center">
                    <div>
                      <Badge data-testid={`run-status-${run.id}`} variant={statusConfig.variant} className="flex items-center gap-1 w-fit">
                        <StatusIcon className={`w-3 h-3 ${run.status === "running" ? "animate-spin" : ""}`} />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <div className="font-medium truncate" title={run.tools?.name}>
                      {run.tools?.name || "不明"}
                    </div>
                    <div className="text-muted-foreground truncate" title={run.profiles?.email}>
                      {run.profiles?.email || "不明"}
                    </div>
                    <div className="text-muted-foreground">
                      {formatDateTime(run.started_at)}
                    </div>
                    <div className="text-muted-foreground">
                      {formatDateTime(run.finished_at)}
                    </div>
                    <div className="flex items-center gap-2">
                      {run.summary && (
                        <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={run.summary}>
                          {run.summary}
                        </span>
                      )}
                      {run.error_message && (
                        <span className="text-xs text-red-600 truncate max-w-[100px]" title={run.error_message}>
                          {run.error_message}
                        </span>
                      )}
                      {run.log_url && (
                        <a
                          href={run.log_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="ログを表示"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <div>
                      {run.log_path && <LogPathActions logPath={run.log_path} />}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              実行履歴がありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
