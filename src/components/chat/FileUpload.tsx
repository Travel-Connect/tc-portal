"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Paperclip, X, FileText, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageLightbox, ImageThumbnail } from "./ImageLightbox";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_ATTACHMENTS,
  isAllowedFile,
  formatFileSize,
} from "@/lib/config/attachments";

// 画像MIMEタイプ
const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];

function isImageFile(file: File): boolean {
  return IMAGE_MIME_TYPES.includes(file.type);
}

function isImageMimeType(mimeType: string | null): boolean {
  return mimeType ? IMAGE_MIME_TYPES.includes(mimeType) : false;
}

interface FileWithPreview {
  file: File;
  previewUrl?: string;
}

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function FileUpload({ files, onFilesChange, disabled, textareaRef }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [filesWithPreview, setFilesWithPreview] = useState<FileWithPreview[]>([]);

  // filesが変更されたらプレビューURLを生成
  useEffect(() => {
    const newFilesWithPreview: FileWithPreview[] = files.map((file) => {
      // 既存のプレビューを探す
      const existing = filesWithPreview.find((f) => f.file === file);
      if (existing) return existing;

      // 画像の場合はプレビューURLを生成
      if (isImageFile(file)) {
        return {
          file,
          previewUrl: URL.createObjectURL(file),
        };
      }
      return { file };
    });

    // 古いプレビューURLを解放
    filesWithPreview.forEach((f) => {
      if (f.previewUrl && !newFilesWithPreview.some((n) => n.previewUrl === f.previewUrl)) {
        URL.revokeObjectURL(f.previewUrl);
      }
    });

    setFilesWithPreview(newFilesWithPreview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      filesWithPreview.forEach((f) => {
        if (f.previewUrl) {
          URL.revokeObjectURL(f.previewUrl);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      setError(null);

      // 選択可能な残り枠
      const remainingSlots = MAX_ATTACHMENTS - files.length;
      if (newFiles.length > remainingSlots) {
        setError(`あと${remainingSlots}件まで添付できます`);
        return false;
      }

      // 各ファイルをバリデーション
      const validFiles: File[] = [];
      for (const file of newFiles) {
        const validation = isAllowedFile(file);
        if (!validation.allowed) {
          setError(validation.error || "ファイルを追加できません");
          return false;
        }
        validFiles.push(file);
      }

      onFilesChange([...files, ...validFiles]);
      return true;
    },
    [files, onFilesChange]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);

    // inputをリセット
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  // ペースト処理
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // 画像のみを処理（テキストは無視）
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            // ファイル名を生成（スクリーンショットの場合nameがないことがある）
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const ext = item.type.split("/")[1] || "png";
            const namedFile = new File(
              [file],
              file.name || `screenshot-${timestamp}.${ext}`,
              { type: file.type }
            );
            imageFiles.push(namedFile);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        addFiles(imageFiles);
      }
    },
    [addFiles]
  );

  // textareaにペーストイベントを追加
  useEffect(() => {
    const textarea = textareaRef?.current;
    if (textarea) {
      textarea.addEventListener("paste", handlePaste);
      return () => {
        textarea.removeEventListener("paste", handlePaste);
      };
    }
  }, [textareaRef, handlePaste]);

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
    setError(null);
  };

  const acceptTypes = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

  // 画像とその他のファイルを分離
  const imageFiles = filesWithPreview.filter((f) => isImageFile(f.file));
  const otherFiles = filesWithPreview.filter((f) => !isImageFile(f.file));

  return (
    <div className="space-y-2">
      {/* 画像プレビュー（入力欄の上に表示） */}
      {imageFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
          {imageFiles.map((fileWithPreview, index) => {
            const originalIndex = files.indexOf(fileWithPreview.file);
            return (
              <ImageThumbnail
                key={`img-${fileWithPreview.file.name}-${index}`}
                src={fileWithPreview.previewUrl || ""}
                alt={fileWithPreview.file.name}
                onRemove={() => removeFile(originalIndex)}
                disabled={disabled}
              />
            );
          })}
        </div>
      )}

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
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* 選択済みファイル一覧（画像以外） */}
      {otherFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {otherFiles.map((fileWithPreview, index) => {
            const originalIndex = files.indexOf(fileWithPreview.file);
            return (
              <div
                key={`file-${fileWithPreview.file.name}-${index}`}
                className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs"
              >
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="max-w-[150px] truncate">{fileWithPreview.file.name}</span>
                <span className="text-muted-foreground">
                  ({formatFileSize(fileWithPreview.file.size)})
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(originalIndex)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
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
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    alt: string;
    downloadUrl: string;
    fileName: string;
  } | null>(null);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  // 画像添付ファイルのプレビューURLを取得
  useEffect(() => {
    const imageAttachments = attachments.filter((a) => isImageMimeType(a.mime_type));

    imageAttachments.forEach((attachment) => {
      if (!imagePreviews[attachment.id] && !loadingImages.has(attachment.id)) {
        setLoadingImages((prev) => new Set(prev).add(attachment.id));

        // signed URLを取得
        fetch(`/api/chat/attachments/${attachment.id}/preview`)
          .then((res) => res.json())
          .then((data) => {
            if (data.url) {
              setImagePreviews((prev) => ({ ...prev, [attachment.id]: data.url }));
            }
          })
          .catch((err) => {
            console.error("Error fetching image preview:", err);
          })
          .finally(() => {
            setLoadingImages((prev) => {
              const next = new Set(prev);
              next.delete(attachment.id);
              return next;
            });
          });
      }
    });
  }, [attachments, imagePreviews, loadingImages]);

  if (attachments.length === 0) return null;

  const handleDownload = async (attachmentId: string) => {
    setDownloadingId(attachmentId);
    try {
      window.open(`/api/chat/attachments/${attachmentId}/download`, "_blank");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleImageClick = (attachment: {
    id: string;
    file_name: string;
    mime_type: string | null;
  }) => {
    const previewUrl = imagePreviews[attachment.id];
    if (previewUrl) {
      setLightboxImage({
        src: previewUrl,
        alt: attachment.file_name,
        downloadUrl: `/api/chat/attachments/${attachment.id}/download`,
        fileName: attachment.file_name,
      });
    }
  };

  // 画像とその他のファイルを分離
  const imageAttachments = attachments.filter((a) => isImageMimeType(a.mime_type));
  const otherAttachments = attachments.filter((a) => !isImageMimeType(a.mime_type));

  return (
    <>
      <div className="mt-2 space-y-2">
        {/* 画像サムネイル */}
        {imageAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imageAttachments.map((attachment) => {
              const previewUrl = imagePreviews[attachment.id];
              const isLoading = loadingImages.has(attachment.id);

              return (
                <div
                  key={attachment.id}
                  className="relative cursor-pointer"
                  onClick={() => handleImageClick(attachment)}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={attachment.file_name}
                      className="w-24 h-24 object-cover rounded border hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="w-24 h-24 flex items-center justify-center bg-muted rounded border">
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* その他のファイル */}
        {otherAttachments.map((attachment) => (
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

      {/* Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          downloadUrl={lightboxImage.downloadUrl}
          fileName={lightboxImage.fileName}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </>
  );
}
