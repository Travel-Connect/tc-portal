// Database types for TC Portal

export type ToolType =
  | "url"
  | "sheet"
  | "excel"
  | "bi"
  | "exe"
  | "python_runner"
  | "pad"
  | "folder_set"
  | "folder"
  | "shortcut"
  | "bat";

export type IconMode = "lucide" | "upload";

export type UserRole = "admin" | "member";

export type ExecutionMode = "open" | "queue" | "helper";

export type RunStatus = "queued" | "running" | "success" | "failed" | "canceled";

// Excelツールの起動モード
export type ExcelOpenMode = "file" | "folder_latest_created" | "folder_pick";

export const EXCEL_OPEN_MODE_LABELS: Record<ExcelOpenMode, string> = {
  file: "指定ファイルを開く",
  folder_latest_created: "フォルダ内の最新ファイルを開く",
  folder_pick: "フォルダから選択して開く",
};

// run_config の型定義
export interface PythonRunnerConfig {
  script?: string;
  args?: string[];
}

export interface PadRunConfig {
  flow_name?: string;
  command?: string;
}

export interface FolderSetConfig {
  paths: string[];
}

export type RunConfig = PythonRunnerConfig | PadRunConfig | FolderSetConfig;

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  sort_index: number;
  created_at: string;
}

export interface Tool {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  tool_type: ToolType;
  target: string | null;
  icon_mode: IconMode;
  icon_key: string | null;
  icon_path: string | null;
  is_archived: boolean;
  execution_mode: ExecutionMode;
  run_config: RunConfig | null;
  tags: string[];
  // Excel専用フィールド
  excel_open_mode: ExcelOpenMode;
  excel_folder_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  user_id: string;
  tool_id: string;
  created_at: string;
}

export interface Pin {
  user_id: string;
  tool_id: string;
  created_at: string;
}

export interface ToolOrder {
  user_id: string;
  tool_id: string;
  sort_index: number;
  updated_at: string;
}

export interface Machine {
  id: string;
  name: string;
  key_hash: string;
  enabled: boolean;
  last_seen_at: string | null;
  hostname: string | null;
  created_at: string;
}

export interface Run {
  id: string;
  tool_id: string;
  requested_by: string;
  requested_at: string;
  status: RunStatus;
  started_at: string | null;
  finished_at: string | null;
  summary: string | null;
  error_message: string | null;
  log_path: string | null;
  log_url: string | null;
  machine_id: string | null;
  target_machine_id: string | null;
  run_token_hash: string;
  payload: Record<string, unknown> | null;
}

// Extended types with relations
export interface ToolWithCategory extends Tool {
  category?: Category;
}

export interface RunWithDetails extends Run {
  tools?: Tool;
  profiles?: Profile;
}

/**
 * tool_type から execution_mode を決定する
 * - open: url, sheet (ブラウザで開く)
 * - queue: python_runner, pad (Runner経由で実行)
 * - helper: excel, bi, folder, folder_set, shortcut, exe, bat (ローカルHelper起動)
 */
export function getExecutionModeForToolType(toolType: ToolType): ExecutionMode {
  switch (toolType) {
    // open: ブラウザで新しいタブを開く
    case "url":
    case "sheet":
      return "open";

    // queue: Runsに積んでRunnerで実行
    case "python_runner":
    case "pad":
      return "queue";

    // helper: tcportal://でローカルHelper起動
    case "excel":
    case "bi":
    case "folder":
    case "folder_set":
    case "shortcut":
    case "exe":
    case "bat":
      return "helper";

    default:
      // 未知の tool_type は helper にフォールバック
      return "helper";
  }
}

// Tool type labels for display
export const TOOL_TYPE_LABELS: Record<ToolType, string> = {
  url: "Web",
  sheet: "Sheet",
  excel: "Excel",
  bi: "BI",
  exe: "EXE",
  python_runner: "Python",
  pad: "PAD",
  folder_set: "Folder",
  folder: "Folder",
  shortcut: "Shortcut",
  bat: "BAT",
};

// Tool type badge colors
export const TOOL_TYPE_VARIANTS: Record<ToolType, "default" | "secondary" | "outline" | "destructive"> = {
  url: "default",
  sheet: "secondary",
  excel: "secondary",
  bi: "default",
  exe: "outline",
  python_runner: "default",
  pad: "secondary",
  folder_set: "outline",
  folder: "outline",
  shortcut: "outline",
  bat: "outline",
};

// Tool type options for forms
export const TOOL_TYPE_OPTIONS: { value: ToolType; label: string }[] = [
  { value: "url", label: "Web (URL)" },
  { value: "sheet", label: "スプレッドシート" },
  { value: "excel", label: "Excel" },
  { value: "bi", label: "BI (Power BI等)" },
  { value: "exe", label: "EXE (実行ファイル)" },
  { value: "python_runner", label: "Python" },
  { value: "pad", label: "PAD (Power Automate)" },
  { value: "folder", label: "フォルダ" },
  { value: "folder_set", label: "フォルダセット (複数)" },
  { value: "bat", label: "BAT (バッチファイル)" },
  { value: "shortcut", label: "ショートカット" },
];
