"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

interface MentionPickerProps {
  /**
   * メンション候補となるユーザーリスト
   */
  users: Profile[];
  /**
   * テキストエリアの参照
   */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /**
   * 現在のテキスト
   */
  text: string;
  /**
   * テキスト変更時のコールバック
   */
  onTextChange: (text: string) => void;
  /**
   * メンションが挿入された時のコールバック（通知用等）
   */
  onMentionInserted?: (userId: string, displayName: string) => void;
}

interface MentionState {
  isOpen: boolean;
  query: string;
  startIndex: number;
  position: { top: number; left: number };
  selectedIndex: number;
}

/**
 * @メンションピッカー
 * テキストエリアと連携し、@入力時にユーザー候補を表示
 */
export function MentionPicker({
  users,
  textareaRef,
  text,
  onTextChange,
  onMentionInserted,
}: MentionPickerProps) {
  const [mentionState, setMentionState] = useState<MentionState>({
    isOpen: false,
    query: "",
    startIndex: 0,
    position: { top: 0, left: 0 },
    selectedIndex: 0,
  });
  const pickerRef = useRef<HTMLDivElement>(null);

  // フィルタされたユーザーリスト
  const filteredUsers = users.filter((user) => {
    const query = mentionState.query.toLowerCase();
    const displayName = (user.display_name || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    return displayName.includes(query) || email.includes(query);
  });

  // メンションを挿入
  const insertMention = useCallback(
    (user: Profile) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const displayName = user.display_name || user.email.split("@")[0];
      const mentionTag = `<mention data-user-id="${user.id}">@${displayName}</mention>`;

      // @とクエリを置き換え
      const beforeMention = text.substring(0, mentionState.startIndex);
      const afterMention = text.substring(textarea.selectionStart);
      const newText = `${beforeMention}${mentionTag} ${afterMention}`;

      onTextChange(newText);
      onMentionInserted?.(user.id, displayName);

      // ピッカーを閉じる
      setMentionState((prev) => ({ ...prev, isOpen: false, query: "" }));

      // カーソル位置を調整
      setTimeout(() => {
        const newCursorPos = beforeMention.length + mentionTag.length + 1;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    },
    [text, mentionState.startIndex, textareaRef, onTextChange, onMentionInserted]
  );

  // キーボードイベントハンドラ
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!mentionState.isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setMentionState((prev) => ({
            ...prev,
            selectedIndex: prev.selectedIndex < filteredUsers.length - 1 ? prev.selectedIndex + 1 : prev.selectedIndex,
          }));
          break;
        case "ArrowUp":
          e.preventDefault();
          setMentionState((prev) => ({
            ...prev,
            selectedIndex: prev.selectedIndex > 0 ? prev.selectedIndex - 1 : prev.selectedIndex,
          }));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredUsers[mentionState.selectedIndex]) {
            insertMention(filteredUsers[mentionState.selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setMentionState((prev) => ({ ...prev, isOpen: false }));
          break;
        case "Tab":
          e.preventDefault();
          if (filteredUsers[mentionState.selectedIndex]) {
            insertMention(filteredUsers[mentionState.selectedIndex]);
          }
          break;
      }
    },
    [mentionState.isOpen, mentionState.selectedIndex, filteredUsers, insertMention]
  );

  // キーボードイベントをリッスン
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.addEventListener("keydown", handleKeyDown);
    return () => textarea.removeEventListener("keydown", handleKeyDown);
  }, [textareaRef, handleKeyDown]);

  // ピッカーの位置計算とメンション検出
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleInput = () => {
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = text.substring(0, cursorPos);

      // 最後の@を探す
      const atIndex = textBeforeCursor.lastIndexOf("@");

      if (atIndex === -1) {
        setMentionState((prev) => ({ ...prev, isOpen: false }));
        return;
      }

      // @の前が空白または文頭かチェック
      const charBeforeAt = atIndex > 0 ? textBeforeCursor[atIndex - 1] : " ";
      if (!/[\s\n]/.test(charBeforeAt) && atIndex !== 0) {
        setMentionState((prev) => ({ ...prev, isOpen: false }));
        return;
      }

      // @以降のテキストを取得
      const query = textBeforeCursor.substring(atIndex + 1);

      // クエリにスペースが含まれていたらメンション終了
      if (/\s/.test(query)) {
        setMentionState((prev) => ({ ...prev, isOpen: false }));
        return;
      }

      // 位置を計算（簡易版：テキストエリアの下に表示）
      const rect = textarea.getBoundingClientRect();
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
      const lines = textBeforeCursor.split("\n");
      const currentLineIndex = lines.length - 1;

      setMentionState((prev) => ({
        isOpen: true,
        query,
        startIndex: atIndex,
        position: {
          top: rect.top + (currentLineIndex + 1) * lineHeight + 5,
          left: rect.left,
        },
        // クエリが変わった場合は選択インデックスをリセット
        selectedIndex: prev.query !== query ? 0 : prev.selectedIndex,
      }));
    };

    // selectionchangeイベントでカーソル位置の変化を検出
    const handleSelectionChange = () => {
      if (document.activeElement === textarea) {
        handleInput();
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [text, textareaRef]);

  if (!mentionState.isOpen || filteredUsers.length === 0) {
    return null;
  }

  return (
    <div
      ref={pickerRef}
      className="absolute z-50 w-96 bg-popover border rounded-lg shadow-xl flex flex-col"
      style={{
        bottom: "100%",
        left: 0,
        marginBottom: "8px",
        maxHeight: "360px",
      }}
    >
      {/* ヘッダー */}
      <div className="px-3 py-2 border-b bg-muted/30 flex-shrink-0">
        <span className="text-xs font-medium text-muted-foreground">メンションするユーザーを選択</span>
      </div>
      {/* ユーザーリスト（スクロール可能） */}
      <ul className="py-1 overflow-y-auto flex-1">
        {filteredUsers.slice(0, 10).map((user, index) => (
          <li key={user.id}>
            <button
              type="button"
              className={cn(
                "w-full px-3 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-3",
                index === mentionState.selectedIndex && "bg-muted"
              )}
              onClick={() => insertMention(user)}
              onMouseEnter={() => setMentionState((prev) => ({ ...prev, selectedIndex: index }))}
            >
              {/* アバター */}
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium flex-shrink-0">
                {getInitials(user.display_name, user.email)}
              </div>
              {/* ユーザー情報 */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {user.display_name || user.email.split("@")[0]}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user.email}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
      {/* フッター：キーボードショートカットヒント */}
      <div className="px-3 py-1.5 border-t bg-muted/20 text-xs text-muted-foreground flex-shrink-0">
        <span>↑↓ 選択</span>
        <span className="mx-2">·</span>
        <span>Enter/Tab 確定</span>
        <span className="mx-2">·</span>
        <span>Esc 閉じる</span>
      </div>
    </div>
  );
}

// イニシャルを取得
function getInitials(displayName: string | null, email: string): string {
  if (displayName) {
    const firstChar = displayName.charAt(0);
    if (/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/.test(firstChar)) {
      return firstChar;
    }
    const words = displayName.split(/\s+/);
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

/**
 * メンションピッカーが開いているかどうかを判定するユーティリティ
 * Enterキーの挙動を制御するために使用
 */
export function isMentionActive(
  text: string,
  cursorPos: number
): boolean {
  const textBeforeCursor = text.substring(0, cursorPos);
  const atIndex = textBeforeCursor.lastIndexOf("@");

  if (atIndex === -1) return false;

  const charBeforeAt = atIndex > 0 ? textBeforeCursor[atIndex - 1] : " ";
  if (!/[\s\n]/.test(charBeforeAt) && atIndex !== 0) return false;

  const query = textBeforeCursor.substring(atIndex + 1);
  return !/\s/.test(query);
}
