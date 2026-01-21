/**
 * TC Portal Helper URL生成ユーティリティ
 *
 * tcportal:// URLスキームを使用してWindows Helperでローカルアプリを起動する
 */

import type { Tool, ToolType, FolderSetConfig, ExcelOpenMode } from "@/types/database";

// Helper対象のツールタイプ
export const HELPER_TOOL_TYPES: ToolType[] = [
  "excel",
  "bi",
  "folder",
  "folder_set",
  "shortcut",
  "exe",
  "bat",
];

// 確認モーダルなしで即起動できる安全なHelperツール
export const SAFE_HELPER_TYPES: ToolType[] = [
  "folder",
  "folder_set",
  "shortcut",
  "excel",
  "bi",
];

// 確認モーダル必須の危険なHelperツール（実行系）
export const DANGEROUS_HELPER_TYPES: ToolType[] = [
  "exe",
  "bat",
];

// ツールタイプごとのアクションマッピング
const TOOL_TYPE_TO_ACTION: Record<string, string> = {
  excel: "open_file",
  bi: "open_file",
  folder: "open_folder",
  folder_set: "open_folders",
  shortcut: "open_shortcut",
  exe: "run_exe",
  bat: "run_bat",
};

// ツールタイプごとの成功メッセージ
export const HELPER_SUCCESS_MESSAGES: Record<string, string> = {
  excel: "Excelを開きました",
  bi: "Power BIを開きました",
  folder: "フォルダを開きました",
  folder_set: "フォルダセットを開きました",
  shortcut: "ショートカットを実行しました",
  exe: "EXE起動（ローカル）",
  bat: "BAT実行（ローカル）",
};

export interface HelperPayload {
  action: string;
  path?: string;
  paths?: string[];
  url?: string;
  // Excel専用
  excel_open_mode?: ExcelOpenMode;
  excel_folder_path?: string;
}

/**
 * payloadをBase64URLエンコードする
 */
function encodePayload(payload: HelperPayload): string {
  const json = JSON.stringify(payload);
  // UTF-8バイト配列に変換してBase64エンコード
  const bytes = new TextEncoder().encode(json);
  const base64 = btoa(String.fromCharCode(...bytes));
  // Base64をBase64URLに変換（+→-, /→_, =を削除）
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * ツールからtcportal:// URLを生成する
 */
export function generateHelperUrl(tool: Tool): string | null {
  if (!HELPER_TOOL_TYPES.includes(tool.tool_type)) {
    return null;
  }

  const action = TOOL_TYPE_TO_ACTION[tool.tool_type];
  if (!action) {
    return null;
  }

  let payload: HelperPayload;

  if (tool.tool_type === "folder_set") {
    // folder_setの場合はrun_config.pathsを使用
    const config = tool.run_config as FolderSetConfig | null;
    const paths = config?.paths || [];

    // pathsがない場合はtargetをフォールバック
    if (paths.length === 0 && tool.target) {
      paths.push(tool.target);
    }

    if (paths.length === 0) {
      return null;
    }

    payload = { action, paths };
  } else if (tool.tool_type === "excel") {
    // Excel: excel_open_modeに応じて分岐
    const excelMode = tool.excel_open_mode || "file";

    if (excelMode === "file") {
      // 従来通り指定ファイルを開く
      if (!tool.target) {
        return null;
      }
      payload = { action, path: tool.target, excel_open_mode: excelMode };
    } else if (excelMode === "folder_latest_created") {
      // フォルダ内の最新ファイルを開く
      if (!tool.excel_folder_path) {
        return null;
      }
      payload = {
        action,
        excel_open_mode: excelMode,
        excel_folder_path: tool.excel_folder_path,
      };
    } else if (excelMode === "folder_pick") {
      // フォルダから選択して開く
      payload = {
        action,
        excel_open_mode: excelMode,
        excel_folder_path: tool.excel_folder_path || undefined,
      };
    } else {
      // 不明なモードはエラー
      return null;
    }
  } else {
    // その他のタイプはtargetを使用
    if (!tool.target) {
      return null;
    }

    payload = { action, path: tool.target };
  }

  const encodedPayload = encodePayload(payload);
  return `tcportal://open?payload=${encodedPayload}`;
}

/**
 * ツールがHelper対象かどうかを判定
 */
export function isHelperTool(tool: Tool): boolean {
  return HELPER_TOOL_TYPES.includes(tool.tool_type);
}

/**
 * Helperツールが確認モーダルなしで即起動可能かどうかを判定
 */
export function isSafeHelperTool(tool: Tool): boolean {
  return SAFE_HELPER_TYPES.includes(tool.tool_type);
}

/**
 * ツールが確認モーダル必須かどうかを判定
 * - queue (Runner経由): 必須
 * - helper (危険: exe/bat): 必須
 * - helper (安全: folder等): 不要
 * - open: 不要（ブラウザで開くだけ）
 */
export function requiresConfirmation(tool: Tool): boolean {
  if (tool.execution_mode === "queue") {
    return true;
  }
  if (tool.execution_mode === "helper") {
    return DANGEROUS_HELPER_TYPES.includes(tool.tool_type);
  }
  return false;
}

/**
 * tcportal:// URLを起動する
 * ブラウザでクリック直後に呼び出すことでブロックを回避
 */
export function launchHelperUrl(url: string): void {
  // window.location.hrefで即時起動
  window.location.href = url;
}
