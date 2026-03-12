import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/announcements/webhook
 * 外部システム（OTAログインツール等）からお知らせを自動作成するエンドポイント
 *
 * Headers:
 *   X-Webhook-Key: Webhook認証キー（必須）
 *
 * Body (JSON):
 *   title: string        - お知らせタイトル
 *   body: string         - お知らせ本文
 *   external_ref: string - 重複防止用の外部参照キー（必須）
 *
 * Behavior:
 *   - external_ref が既存の場合: title/body を更新し published 状態を維持
 *   - external_ref が新規の場合: 新しいお知らせを published で作成
 */
export async function POST(request: NextRequest) {
  const webhookKey = request.headers.get("X-Webhook-Key");
  const expectedKey = process.env.ANNOUNCEMENT_WEBHOOK_KEY;

  if (!expectedKey || !webhookKey || webhookKey !== expectedKey) {
    return NextResponse.json(
      { error: "Invalid or missing X-Webhook-Key" },
      { status: 401 }
    );
  }

  try {
    const { title, body, external_ref } = (await request.json()) as {
      title: string;
      body: string;
      external_ref: string;
    };

    if (!title || !body || !external_ref) {
      return NextResponse.json(
        { error: "title, body, external_ref are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // external_ref で既存のお知らせを検索
    const { data: existing } = await supabase
      .from("announcements")
      .select("id")
      .eq("external_ref", external_ref)
      .maybeSingle();

    if (existing) {
      // 既存を更新（内容が変わった場合）
      const { error } = await supabase
        .from("announcements")
        .update({
          title,
          body,
          updated_at: now,
        })
        .eq("id", existing.id);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        action: "updated",
        id: existing.id,
      });
    }

    // 新規作成（即座に published）
    const { data: created, error } = await supabase
      .from("announcements")
      .insert({
        title,
        body,
        status: "published",
        published_at: now,
        external_ref,
        created_by: null,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      action: "created",
      id: created.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[announcements/webhook] Error:", message);
    return NextResponse.json(
      { error: "Failed to create announcement", details: message },
      { status: 500 }
    );
  }
}
