"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tool, Category } from "@/types/database";
import { TOOL_TYPE_LABELS, TOOL_TYPE_VARIANTS, isUrlRunConfig } from "@/types/database";
import { ToolIcon } from "./ToolIcon";
import { togglePin } from "@/lib/actions/favorites";
import { ExecuteConfirmDialog } from "./ExecuteConfirmDialog";
import { MultiUrlDialog } from "./MultiUrlDialog";
import {
  isSafeHelperTool,
  requiresConfirmation,
  generateHelperUrl,
} from "@/lib/helper";
import { createHelperRun } from "@/lib/actions/runs";

// 実行ボタンを表示するツールタイプ（確認が必要なもののみ）
const SHOW_EXECUTE_BUTTON_TYPES = [
  "python_runner",
  "pad",
  "exe",
  "bat",
];

interface ToolCardProps {
  tool: Tool;
  category?: Category | null;
  isPinned?: boolean;
  showActions?: boolean;
  disableLink?: boolean;
  accentColor?: string | null;
}

export function ToolCard({
  tool,
  category,
  isPinned = false,
  showActions = true,
  disableLink = false,
  accentColor,
}: ToolCardProps) {
  const router = useRouter();
  const [optimisticPinned, setOptimisticPinned] = useState(isPinned);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handlePinClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setOptimisticPinned(!optimisticPinned);
    startTransition(async () => {
      const result = await togglePin(tool.id);
      if (!result.success) {
        setOptimisticPinned(result.isPinned);
      }
    });
  };

  // 安全なHelperツールを即起動（確認なし）
  const launchSafeHelper = () => {
    const helperUrl = generateHelperUrl(tool);
    if (!helperUrl) {
      // ターゲット未設定の場合は詳細ページへ
      router.push(`/tools/${tool.id}`);
      return;
    }

    // 即起動（クリックイベント直後に実行してブロック回避）
    window.location.href = helperUrl;

    // 非同期でログ記録（UIブロックしない）
    createHelperRun(tool.id).catch(() => {
      // ログ記録失敗は無視（起動は成功している）
    });
  };

  // カードクリックのハンドラ
  const handleCardClick = () => {
    // disableLinkの場合は何もしない
    if (disableLink) return;

    // execution_modeに応じた処理
    switch (tool.execution_mode) {
      case "open":
        if (hasMultiUrl) {
          // 複数URLモーダルを開く
          setDialogOpen(true);
          return;
        }
        // URL/Sheet（Google Sheets）タイプは新しいタブで開く
        if ((tool.tool_type === "url" || tool.tool_type === "sheet") && tool.target) {
          window.open(tool.target, "_blank", "noopener,noreferrer");
          return;
        }
        // その他のopenは詳細ページへ
        router.push(`/tools/${tool.id}`);
        break;

      case "helper":
        if (isSafeHelperTool(tool)) {
          // 安全なHelperは即起動
          launchSafeHelper();
        } else {
          // 危険なHelperは確認ダイアログ
          setDialogOpen(true);
        }
        break;

      case "queue":
        // Runner経由は確認ダイアログ
        setDialogOpen(true);
        break;

      default:
        // 不明なモードは詳細ページへ
        router.push(`/tools/${tool.id}`);
    }
  };

  // 複数URL判定
  const hasMultiUrl = isUrlRunConfig(tool.run_config);

  // 確認モーダルが必要かどうか
  const needsConfirmation = requiresConfirmation(tool);

  // 実行ボタンを表示するか（確認が必要なツール + 複数URLツール）
  const showExecuteButton =
    SHOW_EXECUTE_BUTTON_TYPES.includes(tool.tool_type) || hasMultiUrl;

  // アクセントカラーがある場合、背景を薄く染める
  const cardStyle = accentColor
    ? { backgroundColor: `${accentColor}15` } // 15 = 約8%の透明度
    : undefined;

  const cardContent = (
    <Card
      data-testid={`tool-card-${tool.id}`}
      className={`transition-shadow h-full ${disableLink ? "" : "hover:shadow-md cursor-pointer"}`}
      style={cardStyle}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <ToolIcon tool={tool} className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base truncate">{tool.name}</CardTitle>
              {category && (
                <p className="text-sm text-muted-foreground truncate">{category.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge variant={TOOL_TYPE_VARIANTS[tool.tool_type]}>
              {TOOL_TYPE_LABELS[tool.tool_type]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {tool.description || "説明なし"}
            </p>
            {tool.tags && tool.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tool.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
                {tool.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
                    +{tool.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
          {showActions && (
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              {showExecuteButton && (
                <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  {hasMultiUrl ? (
                    <MultiUrlDialog tool={tool} open={dialogOpen} onOpenChange={setDialogOpen}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="実行"
                      >
                        <Play className="w-4 h-4 text-green-600" />
                      </Button>
                    </MultiUrlDialog>
                  ) : (
                    <ExecuteConfirmDialog tool={tool} open={dialogOpen} onOpenChange={setDialogOpen}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="実行"
                      >
                        <Play className="w-4 h-4 text-green-600" />
                      </Button>
                    </ExecuteConfirmDialog>
                  )}
                </div>
              )}
              <Button
                data-testid={`pin-toggle-${tool.id}`}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePinClick}
                disabled={isPending}
                title={optimisticPinned ? "ピン解除" : "ピン留め"}
              >
                <Pin
                  className={`w-4 h-4 ${optimisticPinned ? "fill-current text-blue-500" : "text-muted-foreground"}`}
                />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // 複数URLツールのカード外ダイアログ
  if (hasMultiUrl && !showExecuteButton) {
    return (
      <>
        {cardContent}
        <MultiUrlDialog tool={tool} open={dialogOpen} onOpenChange={setDialogOpen}>
          <span className="hidden" />
        </MultiUrlDialog>
      </>
    );
  }

  // 確認ダイアログが必要なツールは、ダイアログをカード外に配置
  if (needsConfirmation && !showExecuteButton) {
    return (
      <>
        {cardContent}
        <ExecuteConfirmDialog tool={tool} open={dialogOpen} onOpenChange={setDialogOpen}>
          <span className="hidden" />
        </ExecuteConfirmDialog>
      </>
    );
  }

  return cardContent;
}
