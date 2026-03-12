"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToolIcon } from "@/components/tools/ToolIcon";
import { ExecuteConfirmDialog } from "@/components/tools/ExecuteConfirmDialog";
import type { Tool, Category, RunWithDetails, RunStatus } from "@/types/database";
import { TOOL_TYPE_LABELS, TOOL_TYPE_VARIANTS } from "@/types/database";

const TABS = ["概要", "履歴"] as const;
type Tab = (typeof TABS)[number];

interface ToolDetailClientProps {
  tool: Tool;
  category: Category | null;
  runs: RunWithDetails[];
  lastSuccess: string | null;
  userId: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: RunStatus }) {
  switch (status) {
    case "success":
      return (
        <Badge variant="outline" className="text-green-600 border-green-300">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          成功
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="text-red-600 border-red-300">
          <XCircle className="w-3 h-3 mr-1" />
          失敗
        </Badge>
      );
    case "running":
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-300">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          実行中
        </Badge>
      );
    case "queued":
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-300">
          <Clock className="w-3 h-3 mr-1" />
          待機中
        </Badge>
      );
    case "canceled":
      return (
        <Badge variant="outline" className="text-gray-500 border-gray-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          キャンセル
        </Badge>
      );
  }
}

export function ToolDetailClient({ tool, category, runs, lastSuccess, userId }: ToolDetailClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("概要");
  const [dialogOpen, setDialogOpen] = useState(false);

  const showExecuteButton = ["python_runner", "pad", "exe", "bat"].includes(tool.tool_type);
  const latestRun = runs.length > 0 ? runs[0] : null;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/tools">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
        </Link>
      </div>

      {/* ツール情報 */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
            <ToolIcon tool={tool} className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tool.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={TOOL_TYPE_VARIANTS[tool.tool_type]}>
                {TOOL_TYPE_LABELS[tool.tool_type]}
              </Badge>
              {category && <Badge variant="secondary">{category.name}</Badge>}
              {tool.tags?.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {showExecuteButton && (
            <>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                実行
              </Button>
              <ExecuteConfirmDialog
                tool={tool}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
              />
            </>
          )}
        </div>
      </div>

      {/* タブ */}
      <div className="border-b">
        <div className="flex gap-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
              {tab === "履歴" && runs.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">({runs.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* タブコンテンツ */}
      {activeTab === "概要" && (
        <div className="space-y-4">
          {/* 説明 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">概要</CardTitle>
            </CardHeader>
            <CardContent>
              {tool.description ? (
                <p className="text-sm whitespace-pre-wrap">{tool.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">説明はありません。</p>
              )}
            </CardContent>
          </Card>

          {/* ステータス情報 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-1">種別</p>
                <Badge variant={TOOL_TYPE_VARIANTS[tool.tool_type]}>
                  {TOOL_TYPE_LABELS[tool.tool_type]}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-1">実行方式</p>
                <p className="text-sm font-medium">
                  {tool.execution_mode === "open" ? "ブラウザで開く" :
                   tool.execution_mode === "queue" ? "Runner実行" : "ローカル起動"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-1">最終成功</p>
                <p className="text-sm font-medium">{formatDate(lastSuccess)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-1">最新ステータス</p>
                {latestRun ? <StatusBadge status={latestRun.status} /> : <span className="text-sm text-muted-foreground">—</span>}
              </CardContent>
            </Card>
          </div>

          {/* ターゲット情報 */}
          {tool.target && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-1">ターゲット</p>
                <p className="text-sm font-mono break-all">{tool.target}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "履歴" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">実行履歴</CardTitle>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">実行履歴はありません。</p>
            ) : (
              <div className="space-y-2">
                {runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md border"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge status={run.status} />
                      <div>
                        <p className="text-sm">{formatDate(run.requested_at)}</p>
                        {run.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{run.summary}</p>
                        )}
                        {run.error_message && (
                          <p className="text-xs text-red-500 line-clamp-1">{run.error_message}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {run.finished_at && run.started_at && (
                        <span>
                          {Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)}秒
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
