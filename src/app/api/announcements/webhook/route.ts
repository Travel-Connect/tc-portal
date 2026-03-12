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
 *   - external_ref のプレフィックス（日付部分を除いた部分）で既存を検索
 *   - 同じプレフィックスの既存がある場合: title/body/external_ref を更新（上書き）
 *   - 既存がない場合: 新しいお知らせを published で作成
 *   - これにより 1施設×1カテゴリにつき常に最新の1件だけが残る
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

    // external_ref からプレフィックスを抽出（日付部分を除去）
    // 例: "neppan-pw:d354af6e-...:2026-03-12" → "neppan-pw:d354af6e-..."
    const refParts = external_ref.split(":");
    const refPrefix =
      refParts.length >= 3
        ? refParts.slice(0, -1).join(":") // 最後の日付部分を除去
        : external_ref;

    // 同じプレフィックスを持つ既存のお知らせを検索
    const { data: existing } = await supabase
      .from("announcements")
      .select("id")
      .like("external_ref", `${refPrefix}%`)
      .maybeSingle();

    if (existing) {
      // 既存を上書き（title/body/external_ref/日時を更新）
      const { error } = await supabase
        .from("announcements")
        .update({
          title,
          body,
          external_ref,
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
