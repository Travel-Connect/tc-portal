import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CHAT_ATTACHMENTS_BUCKET } from "@/lib/config/attachments";

/**
 * 添付ファイルのプレビューURL取得API
 * - 認証済みユーザーのみ
 * - 削除されたメッセージの添付は取得不可
 * - Signed URLをJSONで返す（画像プレビュー表示用）
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

  // Signed URL を生成（5分有効、表示用なのでdownloadオプションなし）
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .createSignedUrl(attachment.object_path, 300);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error("Error creating signed URL:", signedUrlError);
    return NextResponse.json(
      { error: "プレビューURLの生成に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: signedUrlData.signedUrl,
    fileName: attachment.file_name,
    mimeType: attachment.mime_type,
  });
}
