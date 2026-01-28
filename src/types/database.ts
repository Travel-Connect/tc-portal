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

// カラープリセット
export type ColorPreset = "red" | "yellow" | "green" | "blue" | "purple";

// カラープリセットのHEX値マッピング
export const COLOR_PRESET_VALUES: Record<ColorPreset, string> = {
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#a855f7",
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

export interface UrlRunConfig {
  open_urls: string[];
  open_behavior: "modal_list";
}

export type RunConfig = PythonRunnerConfig | PadRunConfig | FolderSetConfig | UrlRunConfig;

export function isUrlRunConfig(config: RunConfig | null): config is UrlRunConfig {
  return config !== null && "open_urls" in config && Array.isArray((config as UrlRunConfig).open_urls);
}

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
  // Soft delete
  deleted_at: string | null;
  deleted_by: string | null;
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
  pending_command: string | null;
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

export interface ToolUserPreference {
  id: string;
  user_id: string;
  tool_id: string;
  color_hex: string | null;
  color_preset: ColorPreset | null;
  created_at: string;
  updated_at: string;
}

/**
 * ToolUserPreference から有効なカラーHEX値を取得
 * color_hex が優先、なければ color_preset のHEX値を返す
 */
export function getEffectiveColor(pref: ToolUserPreference | null | undefined): string | null {
  if (!pref) return null;
  if (pref.color_hex) return pref.color_hex;
  if (pref.color_preset && COLOR_PRESET_VALUES[pref.color_preset]) {
    return COLOR_PRESET_VALUES[pref.color_preset];
  }
  return null;
}

// Job監視ステータス
export type JobStatusValue = "success" | "error";

export interface JobStatus {
  id: string;
  job_key: string;
  title: string;
  tool_id: string | null;
  last_status: JobStatusValue;
  last_finished_at: string;
  last_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobStatusWithTool extends JobStatus {
  tools?: Tool | null;
}

// タスク監視
export type TaskKind = "python" | "bat";
export type TaskStatus = "success" | "failed";

export interface TaskMonitor {
  id: string;
  task_key: string;
  task_name: string;
  kind: TaskKind;
  machine_name: string | null;
  enabled: boolean;
  last_status: TaskStatus | null;
  last_started_at: string | null;
  last_finished_at: string | null;
  last_exit_code: number | null;
  last_message: string | null;
  last_log_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskMonitorRun {
  id: string;
  monitor_id: string;
  status: TaskStatus;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  exit_code: number | null;
  message: string | null;
  log_url: string | null;
  raw: Record<string, unknown> | null;
  created_at: string;
}

export interface TaskMonitorRunWithMonitor extends TaskMonitorRun {
  task_monitors?: TaskMonitor;
}

// お知らせ
export type AnnouncementStatus = "draft" | "published";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  status: AnnouncementStatus;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementDismissal {
  announcement_id: string;
  user_id: string;
  dismissed_at: string;
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
 * - helper: excel, bi, folder, folder_set, exe, bat (ローカルHelper起動)
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
];
