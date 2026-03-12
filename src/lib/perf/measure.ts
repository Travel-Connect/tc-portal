/**
 * パフォーマンス計測ユーティリティ
 *
 * 使い方:
 *   const result = await measure("layout.getUser", () => supabase.auth.getUser());
 *
 * 環境変数 NEXT_PUBLIC_DEBUG_PERF=1 で有効化（デフォルト: 無効）
 * ログ例: [PERF] req-abc12 | layout.getUser: 142.3ms
 */

const enabled =
  process.env.NEXT_PUBLIC_DEBUG_PERF === "1" ||
  process.env.NODE_ENV === "development";

let requestCounter = 0;

/**
 * リクエストごとの簡易ID生成（厳密な一意性は不要）
 */
function nextRequestId(): string {
  requestCounter = (requestCounter + 1) % 100000;
  return `req-${requestCounter.toString().padStart(5, "0")}`;
}

/**
 * リクエスト単位でラベルと時間を蓄積するコンテキスト
 */
export interface PerfContext {
  requestId: string;
  entries: { label: string; durationMs: number }[];
}

/**
 * 新しい PerfContext を生成
 */
export function createPerfContext(): PerfContext {
  return { requestId: nextRequestId(), entries: [] };
}

/**
 * 非同期関数の実行時間を計測し、結果をそのまま返す
 */
export async function measure<T>(
  label: string,
  fn: () => Promise<T>,
  ctx?: PerfContext,
): Promise<T> {
  if (!enabled) return fn();

  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;

  const rid = ctx?.requestId ?? "---";
  ctx?.entries.push({ label, durationMs });

  console.log(
    `[PERF] ${rid} | ${label}: ${durationMs.toFixed(1)}ms`,
  );

  return result;
}

/**
 * PerfContext の全エントリをサマリとしてログ出力
 */
export function logPerfSummary(ctx: PerfContext): void {
  if (!enabled || ctx.entries.length === 0) return;

  const total = ctx.entries.reduce((sum, e) => sum + e.durationMs, 0);
  const lines = ctx.entries
    .map((e) => `  ${e.label}: ${e.durationMs.toFixed(1)}ms`)
    .join("\n");

  console.log(
    `[PERF-SUMMARY] ${ctx.requestId} | total(serial): ${total.toFixed(1)}ms\n${lines}`,
  );
}
