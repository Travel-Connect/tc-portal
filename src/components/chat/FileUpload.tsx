"use client";

import { useRef, useState } from "react";
import { Paperclip, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_ATTACHMENTS,
  isAllowedFile,
  formatFileSize,
} from "@/lib/config/attachments";

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}

export function FileUpload({ files, onFilesChange, disabled }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError(null);

    // 選択可能な残り枠
    const remainingSlots = MAX_ATTACHMENTS - files.length;
    if (selectedFiles.length > remainingSlots) {
      setError(`あと${remainingSlots}件まで添付できます`);
      return;
    }

    // 各ファイルをバリデーション
    const validFiles: File[] = [];
    for (const file of selectedFiles) {
      const validation = isAllowedFile(file);
      if (!validation.allowed) {
        setError(validation.error || "ファイルを追加できません");
        return;
      }
      validFiles.push(file);
    }

    onFilesChange([...files, ...validFiles]);

    // inputをリセット
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
    setError(null);
  };

  const acceptTypes = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

  return (
    <div className="space-y-2">
      {/* ファイル選択ボタン */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={acceptTypes}
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || files.length >= MAX_ATTACHMENTS}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || files.length >= MAX_ATTACHMENTS}
          className="h-8 px-2"
        >
          <Paperclip className="h-4 w-4 mr-1" />
          添付
        </Button>
        <span className="text-xs text-muted-foreground">
          {files.length}/{MAX_ATTACHMENTS} (最大{formatFileSize(MAX_FILE_SIZE)}/件)
        </span>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* 選択済みファイル一覧 */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs"
            >
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="max-w-[150px] truncate">{file.name}</span>
              <span className="text-muted-foreground">
                ({formatFileSize(file.size)})
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="ml-1 text-muted-foreground hover:text-foreground"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AttachmentListProps {
  attachments: {
    id: string;
    file_name: string;
    size_bytes: number | null;
    mime_type: string | null;
  }[];
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  const handleDownload = async (attachmentId: string) => {
    setDownloadingId(attachmentId);
    try {
      // 新しいウィンドウでダウンロードURLを開く
      window.open(`/api/chat/attachments/${attachmentId}/download`, "_blank");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="mt-2 space-y-1">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1"
        >
          <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate flex-1">{attachment.file_name}</span>
          {attachment.size_bytes && (
            <span className="text-muted-foreground flex-shrink-0">
              {formatFileSize(attachment.size_bytes)}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => handleDownload(attachment.id)}
            disabled={downloadingId === attachment.id}
          >
            {downloadingId === attachment.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "DL"
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
