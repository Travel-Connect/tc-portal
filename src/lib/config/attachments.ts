/**
 * チャット添付ファイルの設定
 */

// 最大ファイルサイズ（25MB）
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes

// 最大添付ファイル数
export const MAX_ATTACHMENTS = 5;

// 許可されるファイル拡張子
export const ALLOWED_EXTENSIONS = [
  "pdf",
  "xlsx",
  "xls",
  "docx",
  "pptx",
  "png",
  "jpg",
  "jpeg",
  "zip",
  "txt",
] as const;

// 許可されるMIMEタイプ
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "text/plain": "txt",
};

// ファイルサイズをフォーマット
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// ファイル拡張子を取得
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

// ファイルが許可されているか確認
export function isAllowedFile(file: File): { allowed: boolean; error?: string } {
  // サイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return {
      allowed: false,
      error: `ファイルサイズが大きすぎます（最大${formatFileSize(MAX_FILE_SIZE)}）`,
    };
  }

  // 拡張子チェック
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext as typeof ALLOWED_EXTENSIONS[number])) {
    return {
      allowed: false,
      error: `許可されていないファイル形式です（許可: ${ALLOWED_EXTENSIONS.join(", ")}）`,
    };
  }

  return { allowed: true };
}

// Storage bucket名
export const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";
