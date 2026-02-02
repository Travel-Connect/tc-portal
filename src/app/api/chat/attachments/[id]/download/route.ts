import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CHAT_ATTACHMENTS_BUCKET } from "@/lib/config/attachments";

/**
 * 添付ファイルのダウンロードAPI
 * - 認証済みユーザーのみ
 * - 削除されたメッセージの添付はダウンロード不可
 * - Signed URLを生成してリダイレクト
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: attachmentId } = await params;

  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "認証が必要です" },
      { status: 401 }
    );
  }

  // 添付ファイル情報を取得
  const { data: attachment, error: attachmentError } = await supabase
    .from("chat_attachments")
    .select("*, chat_messages!inner(deleted_at)")
    .eq("id", attachmentId)
    .single();

  if (attachmentError || !attachment) {
    return NextResponse.json(
      { error: "添付ファイルが見つかりません" },
      { status: 404 }
    );
  }

  // メッセージが削除されていないかチェック
  const message = attachment.chat_messages as { deleted_at: string | null };
  if (message?.deleted_at) {
    return NextResponse.json(
      { error: "このメッセージは削除されています" },
      { status: 403 }
    );
  }

  // Signed URL を生成（60秒有効）
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .createSignedUrl(attachment.object_path, 60, {
      download: attachment.file_name,
    });

  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error("Error creating signed URL:", signedUrlError);
    return NextResponse.json(
      { error: "ダウンロードURLの生成に失敗しました" },
      { status: 500 }
    );
  }

  // Signed URL にリダイレクト
  return NextResponse.redirect(signedUrlData.signedUrl);
}
