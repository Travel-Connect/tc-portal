import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/monitor/report
 * タスクスケジューラで実行されるジョブ（Python/BAT）の結果を報告するWebhook
 *
 * Headers:
 *   X-TC-Portal-Secret: Webhook シークレット（必須）
 *
 * Body (JSON):
 *   task_key: string      - タスクの一意識別子（例: "nightly_import"）
 *   task_name: string     - UI表示名
 *   kind: "python" | "bat"
 *   status: "success" | "failed"
 *   started_at?: string   - ISO 8601形式の開始日時
 *   finished_at?: string  - ISO 8601形式の完了日時
 *   duration_ms?: number  - 実行時間（ミリ秒）
 *   exit_code?: number    - 終了コード
 *   message?: string      - メッセージやエラー詳細
 *   log_url?: string      - ログファイルのURL/パス
 *   machine_name?: string - 実行PC名（COMPUTERNAME）
 *
 * Response:
 *   200: 成功
 *   400: バリデーションエラー
 *   401: 認証失敗
 *   500: サーバーエラー
 */
export async function POST(request: NextRequest) {
  // シークレットの検証
  const webhookSecret = process.env.TC_PORTAL_WEBHOOK_SECRET;
  const providedSecret = request.headers.get("X-TC-Portal-Secret");

  if (!webhookSecret) {
    console.error("TC_PORTAL_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (!providedSecret || providedSecret !== webhookSecret) {
    return NextResponse.json(
      { error: "Invalid or missing secret" },
      { status: 401 }
    );
  }

  // リクエストボディをパース
  let body: {
    task_key?: string;
    task_name?: string;
    kind?: string;
    status?: string;
    started_at?: string;
    finished_at?: string;
    duration_ms?: number;
    exit_code?: number;
    message?: string;
    log_url?: string;
    machine_name?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // 必須フィールドのバリデーション
  const { task_key, task_name, kind, status, started_at, finished_at, duration_ms, exit_code, message, log_url, machine_name } = body;

  if (!task_key || typeof task_key !== "string") {
    return NextResponse.json(
      { error: "task_key is required and must be a string" },
      { status: 400 }
    );
  }

  if (!task_name || typeof task_name !== "string") {
    return NextResponse.json(
      { error: "task_name is required and must be a string" },
      { status: 400 }
    );
  }

  if (kind !== "python" && kind !== "bat") {
    return NextResponse.json(
      { error: "kind must be 'python' or 'bat'" },
      { status: 400 }
    );
  }

  if (status !== "success" && status !== "failed") {
    return NextResponse.json(
      { error: "status must be 'success' or 'failed'" },
      { status: 400 }
    );
  }

  // 日付のパース
  let parsedStartedAt: Date | null = null;
  let parsedFinishedAt: Date | null = null;

  if (started_at) {
    parsedStartedAt = new Date(started_at);
    if (isNaN(parsedStartedAt.getTime())) {
      return NextResponse.json(
        { error: "started_at must be a valid ISO 8601 date" },
        { status: 400 }
      );
    }
  }

  if (finished_at) {
    parsedFinishedAt = new Date(finished_at);
    if (isNaN(parsedFinishedAt.getTime())) {
      return NextResponse.json(
        { error: "finished_at must be a valid ISO 8601 date" },
        { status: 400 }
      );
    }
  }

  const supabase = createAdminClient();

  // task_monitors を upsert（task_key, kind, machine_name で一意）
  // PostgreSQLのCOALESCEを使ったユニークインデックスに対応するため、RPC呼び出しを使用
  const { data: monitor, error: monitorError } = await supabase
    .from("task_monitors")
    .upsert(
      {
        task_key,
        task_name,
        kind,
        machine_name: machine_name || null,
        last_status: status,
        last_started_at: parsedStartedAt?.toISOString() || null,
        last_finished_at: parsedFinishedAt?.toISOString() || null,
        last_exit_code: exit_code ?? null,
        last_message: message || null,
        last_log_url: log_url || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "task_key,kind,machine_name",
        ignoreDuplicates: false,
      }
    )
    .select("id")
    .single();

  if (monitorError) {
    console.error("Error upserting task_monitors:", monitorError);

    // COALESCE付きユニークインデックスの場合、別のアプローチを試す
    // まず既存レコードを検索
    let query = supabase
      .from("task_monitors")
      .select("id")
      .eq("task_key", task_key)
      .eq("kind", kind);

    // machine_name が指定されている場合は eq、されていない場合は is(null)
    if (machine_name) {
      query = query.eq("machine_name", machine_name);
    } else {
      query = query.is("machine_name", null);
    }

    const { data: existingMonitor, error: selectError } = await query.maybeSingle();

    if (selectError) {
      console.error("Error selecting task_monitors:", selectError);
      return NextResponse.json(
        { error: "Failed to find or create task monitor" },
        { status: 500 }
      );
    }

    let monitorId: string;

    if (existingMonitor) {
      // 既存レコードを更新
      const { error: updateError } = await supabase
        .from("task_monitors")
        .update({
          task_name,
          last_status: status,
          last_started_at: parsedStartedAt?.toISOString() || null,
          last_finished_at: parsedFinishedAt?.toISOString() || null,
          last_exit_code: exit_code ?? null,
          last_message: message || null,
          last_log_url: log_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMonitor.id);

      if (updateError) {
        console.error("Error updating task_monitors:", updateError);
        return NextResponse.json(
          { error: "Failed to update task monitor" },
          { status: 500 }
        );
      }
      monitorId = existingMonitor.id;
    } else {
      // 新規レコードを挿入
      const { data: newMonitor, error: insertError } = await supabase
        .from("task_monitors")
        .insert({
          task_key,
          task_name,
          kind,
          machine_name: machine_name || null,
          last_status: status,
          last_started_at: parsedStartedAt?.toISOString() || null,
          last_finished_at: parsedFinishedAt?.toISOString() || null,
          last_exit_code: exit_code ?? null,
          last_message: message || null,
          last_log_url: log_url || null,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error inserting task_monitors:", insertError);
        return NextResponse.json(
          { error: "Failed to create task monitor" },
          { status: 500 }
        );
      }
      monitorId = newMonitor.id;
    }

    // 履歴を挿入
    const { error: runError } = await supabase
      .from("task_monitor_runs")
      .insert({
        monitor_id: monitorId,
        status,
        started_at: parsedStartedAt?.toISOString() || null,
        finished_at: parsedFinishedAt?.toISOString() || null,
        duration_ms: duration_ms ?? null,
        exit_code: exit_code ?? null,
        message: message || null,
        log_url: log_url || null,
        raw: body,
      });

    if (runError) {
      console.error("Error inserting task_monitor_runs:", runError);
      // 履歴挿入失敗は警告のみ、メイン処理は成功として扱う
    }

    return NextResponse.json({
      ok: true,
      monitor_id: monitorId,
      task_key,
    });
  }

  // 履歴を挿入
  const { error: runError } = await supabase
    .from("task_monitor_runs")
    .insert({
      monitor_id: monitor.id,
      status,
      started_at: parsedStartedAt?.toISOString() || null,
      finished_at: parsedFinishedAt?.toISOString() || null,
      duration_ms: duration_ms ?? null,
      exit_code: exit_code ?? null,
      message: message || null,
      log_url: log_url || null,
      raw: body,
    });

  if (runError) {
    console.error("Error inserting task_monitor_runs:", runError);
    // 履歴挿入失敗は警告のみ、メイン処理は成功として扱う
  }

  return NextResponse.json({
    ok: true,
    monitor_id: monitor.id,
    task_key,
  });
}
