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
  | "shortcut";

export type IconMode = "lucide" | "upload";

export type UserRole = "admin" | "member";

export type ExecutionMode = "open" | "queue";

export type RunStatus = "queued" | "running" | "success" | "failed" | "canceled";

// run_config の型定義
export interface PythonRunnerConfig {
  script?: string;
  args?: string[];
}

export interface PadRunConfig {
  flow_name?: string;
  command?: string;
}

export type RunConfig = PythonRunnerConfig | PadRunConfig;

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
  shortcut: "Shortcut",
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
  shortcut: "outline",
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
  { value: "folder_set", label: "フォルダ" },
  { value: "shortcut", label: "ショートカット" },
];
