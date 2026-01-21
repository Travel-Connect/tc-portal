#!/usr/bin/env python3
"""
TC Portal Windows Runner Agent

Windowsマシンで常駐し、ポータルからの実行依頼をポーリングして実行する。
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import requests

# Windows用のウィンドウ操作
try:
    import win32gui
    import win32con
    import win32process
    import win32api
    HAS_WIN32 = True
except ImportError:
    HAS_WIN32 = False


def load_config() -> dict[str, Any]:
    """設定ファイルを読み込む

    PC名ごとの設定ファイル（config-{COMPUTERNAME}.json）を優先的に読み込む。
    存在しない場合は config.json にフォールバック。
    """
    base_dir = Path(__file__).parent
    computer_name = os.environ.get("COMPUTERNAME", "").upper()

    # PC名ごとの設定ファイルを優先
    pc_config_path = base_dir / f"config-{computer_name}.json"
    generic_config_path = base_dir / "config.json"

    if pc_config_path.exists():
        config_path = pc_config_path
        print(f"Using PC-specific config: {pc_config_path.name}")
    elif generic_config_path.exists():
        config_path = generic_config_path
        print(f"Using generic config: {generic_config_path.name}")
    else:
        print(f"Error: Config file not found.")
        print(f"  Expected: {pc_config_path.name} or config.json")
        print(f"  Copy config.example.json to config.json and edit it.")
        sys.exit(1)

    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def log(message: str) -> None:
    """タイムスタンプ付きでログを出力"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")


def send_heartbeat(config: dict[str, Any]) -> bool:
    """ハートビートを送信してオンライン状態を通知"""
    url = f"{config['portal_url']}/api/runner/heartbeat"
    headers = {
        "X-Machine-Key": config["machine_key"],
        "Content-Type": "application/json",
    }
    # PC名（COMPUTERNAME）をhostnameとして送信
    hostname = os.environ.get("COMPUTERNAME", "")
    payload = {"hostname": hostname}

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code == 200:
            return True
        else:
            log(f"Heartbeat failed: {response.status_code} - {response.text[:100]}")
            return False
    except requests.RequestException as e:
        log(f"Heartbeat error: {e}")
        return False


def claim_task(config: dict[str, Any]) -> Optional[dict[str, Any]]:
    """キューからタスクを取得"""
    url = f"{config['portal_url']}/api/runner/claim"
    headers = {"X-Machine-Key": config["machine_key"]}

    try:
        response = requests.post(url, headers=headers, timeout=30)
        # デバッグ: レスポンス内容を確認
        if response.status_code not in [200, 204]:
            log(f"DEBUG: status={response.status_code}, body={response.text[:200]}")
        if response.status_code == 200:
            data = response.json()
            # APIはタスク情報を直接返す（taskラッパーなし）
            if data.get("run_id"):
                return {
                    "run_id": data["run_id"],
                    "run_token": data.get("run_token"),
                    "tool_type": data["tool"]["tool_type"],
                    "tool_name": data["tool"]["name"],
                    "target": data["tool"].get("target"),
                    "run_config": data["tool"].get("run_config"),
                    "payload": data.get("payload"),
                    "callback_url": data.get("callback_url"),
                }
            return None
        elif response.status_code == 204:
            # タスクなし
            return None
        else:
            log(f"Claim failed: {response.status_code} - {response.text[:200]}")
            return None
    except requests.exceptions.JSONDecodeError as e:
        log(f"JSON parse error: {e}")
        return None
    except requests.RequestException as e:
        log(f"Network error during claim: {e}")
        return None


def report_result(
    config: dict[str, Any],
    run_id: str,
    status: str,
    summary: Optional[str] = None,
    error_message: Optional[str] = None,
    log_path: Optional[str] = None,
    log_url: Optional[str] = None,
) -> bool:
    """実行結果を報告"""
    url = f"{config['portal_url']}/api/runner/report"
    headers = {
        "X-Machine-Key": config["machine_key"],
        "Content-Type": "application/json",
    }
    payload = {
        "run_id": run_id,
        "status": status,
        "summary": summary,
        "error_message": error_message,
        "log_path": log_path,
        "log_url": log_url,
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        if response.status_code == 200:
            log(f"Result reported: {status}")
            return True
        else:
            log(f"Report failed: {response.status_code} - {response.text}")
            return False
    except requests.RequestException as e:
        log(f"Network error during report: {e}")
        return False


def execute_python_runner(task: dict[str, Any], config: dict[str, Any], log_file: Optional[Path] = None) -> tuple[str, Optional[str], Optional[str]]:
    """Pythonスクリプトを実行

    target の形式:
    1. プロジェクトパス|モジュール名 (例: C:\project|src.main)
       - .venv\Scripts\python.exe を自動検出
       - python -m module_name で実行
    2. venv_python スクリプトパス (例: C:\project\.venv\Scripts\python.exe src/main.py)
       - 指定されたvenv Pythonで直接実行
       - プロジェクトルートを作業ディレクトリとして使用
    3. スクリプトパス (例: C:\scripts\main.py)
       - 直接実行
    """
    target = task.get("target")
    run_config = task.get("run_config") or {}
    script = run_config.get("script")
    args = run_config.get("args", [])

    # target フィールドが設定されている場合
    if target:
        # 環境変数を展開（%OneDrive% など）
        expanded_target = os.path.expandvars(target)

        # パイプ区切りの場合: プロジェクトパス|モジュール名
        if "|" in expanded_target:
            project_path_str, module_name = expanded_target.split("|", 1)
            project_path = Path(project_path_str.strip())
            module_name = module_name.strip()

            if not project_path.exists():
                return "failed", None, f"Project path not found: {project_path}"

            # 仮想環境のPythonを探す
            venv_python = project_path / ".venv" / "Scripts" / "python.exe"
            if venv_python.exists():
                python_exe = str(venv_python)
                log(f"Using venv Python: {python_exe}")
            else:
                python_exe = config.get("python_exe", "python")
                log(f"Venv not found, using system Python: {python_exe}")

            # -m フラグでモジュール実行
            cmd = [python_exe, "-m", module_name] + args
            cwd = project_path
            display_name = module_name

            log(f"Executing module: {' '.join(cmd)} (cwd: {cwd})")

        # venv Pythonパス + スクリプトの場合
        elif ".venv" in expanded_target and ("Scripts\\python.exe" in expanded_target or "Scripts/python.exe" in expanded_target):
            # .venv\Scripts\python.exe で分割
            if "Scripts\\python.exe " in expanded_target:
                parts = expanded_target.split("Scripts\\python.exe ", 1)
            else:
                parts = expanded_target.split("Scripts/python.exe ", 1)

            venv_python_path = parts[0] + "Scripts" + os.sep + "python.exe"
            script_relative = parts[1].strip() if len(parts) > 1 else ""

            if not script_relative:
                return "failed", None, "Script path not specified after venv python.exe"

            # プロジェクトルートは .venv の親ディレクトリ
            project_path = Path(parts[0]).parent

            if not Path(venv_python_path).exists():
                return "failed", None, f"Venv Python not found: {venv_python_path}"

            python_exe = venv_python_path
            cmd = [python_exe, script_relative] + args
            cwd = project_path
            display_name = script_relative

            log(f"Executing with venv: {' '.join(cmd)} (cwd: {cwd})")

        else:
            # 従来の直接スクリプト実行
            script_path = Path(expanded_target)

            if not script_path.exists():
                return "failed", None, f"Script not found: {script_path}"

            python_exe = config.get("python_exe", "python")
            cmd = [python_exe, str(script_path)] + args
            cwd = script_path.parent
            display_name = script_path.name

            log(f"Executing script: {' '.join(cmd)}")
    elif script:
        # 従来の run_config.script を使用
        script_path = Path(script)
        if not script_path.is_absolute():
            base_path = config.get("scripts_base_path", "")
            if base_path:
                script_path = Path(base_path) / script

        if not script_path.exists():
            return "failed", None, f"Script not found: {script_path}"

        python_exe = config.get("python_exe", "python")
        cmd = [python_exe, str(script_path)] + args
        cwd = script_path.parent
        display_name = script_path.name

        log(f"Executing: {' '.join(cmd)}")
    else:
        return "failed", None, "Script path not configured (target or run_config.script)"

    try:
        # ログファイルがある場合は出力をキャプチャ、ない場合は新しいコンソールで実行
        if log_file:
            append_to_log(log_file, f"[Command] {' '.join(cmd)}\n")
            append_to_log(log_file, f"[Working Directory] {cwd}\n\n")
            append_to_log(log_file, "[Output]\n")

            process = subprocess.Popen(
                cmd,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
            )

            # リアルタイムで出力を読み取ってログに書き込む
            output_lines = []
            for line in process.stdout:
                output_lines.append(line)
                append_to_log(log_file, line)

            # プロセスの完了を待つ
            timeout = config.get("execution_timeout", 3600)
            returncode = process.wait(timeout=timeout)
        else:
            # 新しいコンソールウィンドウで実行（出力が見える）
            process = subprocess.Popen(
                cmd,
                cwd=cwd,
                creationflags=subprocess.CREATE_NEW_CONSOLE,
            )

            # プロセスの完了を待つ
            timeout = config.get("execution_timeout", 3600)
            returncode = process.wait(timeout=timeout)

        if returncode == 0:
            return "success", f"Python completed: {display_name}", None
        else:
            return "failed", None, f"Exit code: {returncode}"
    except subprocess.TimeoutExpired:
        process.kill()
        return "failed", None, "Execution timed out"
    except Exception as e:
        return "failed", None, str(e)


def execute_pad(task: dict[str, Any], config: dict[str, Any]) -> tuple[str, Optional[str], Optional[str]]:
    """Power Automate Desktop フローを実行"""
    target = task.get("target")
    run_config = task.get("run_config") or {}
    flow_name = run_config.get("flow_name")
    command_template = run_config.get("command")

    # target に ms-powerautomate:// URL が設定されている場合
    if target and target.startswith("ms-powerautomate:"):
        log(f"Executing PAD via protocol: {target}")
        try:
            os.startfile(target)
            # フロー名を抽出して表示
            if "workflowName=" in target:
                workflow_name = target.split("workflowName=")[1].split("&")[0]
                # URLデコード
                import urllib.parse
                workflow_name = urllib.parse.unquote(workflow_name)
                return "success", f"PAD flow started: {workflow_name}", None
            return "success", "PAD flow started", None
        except Exception as e:
            return "failed", None, str(e)

    # 従来の run_config ベースの実行
    if not command_template and not flow_name:
        return "failed", None, "PAD target URL, flow_name, or command not configured"

    # コマンドテンプレートの変数置換
    run_token = task.get("run_token", "")
    run_id = task.get("run_id", "")
    callback_url = f"{config['portal_url']}/api/runs/callback"

    if command_template:
        command = command_template.replace("{{run_token}}", run_token)
        command = command.replace("{{run_id}}", run_id)
        command = command.replace("{{callback_url}}", callback_url)
    else:
        # デフォルトのPAD起動コマンド
        pad_exe = config.get("pad_exe", r"C:\Program Files (x86)\Power Automate Desktop\PAD.Console.Host.exe")
        command = f'"{pad_exe}" /flow "{flow_name}"'

    log(f"Executing PAD: {command}")

    try:
        # PADはバックグラウンドで実行し、コールバックで結果を受け取る
        subprocess.Popen(command, shell=True)
        # PADフローからのコールバックを待つため、ここでは成功を報告しない
        # フローが完了時に /api/runs/callback を呼び出す
        return "running", "PAD flow started, waiting for callback", None
    except Exception as e:
        return "failed", None, str(e)


def _find_main_window(pid: int) -> Optional[int]:
    """プロセスIDからメインウィンドウを探す"""
    hwnds: list[int] = []

    def enum_cb(hwnd: int, _: Any) -> bool:
        if not win32gui.IsWindowVisible(hwnd):
            return True
        # オーナー付きの小窓/ツールウィンドウを除外
        if win32gui.GetWindow(hwnd, win32con.GW_OWNER):
            return True
        try:
            _, p = win32process.GetWindowThreadProcessId(hwnd)
            if p == pid:
                hwnds.append(hwnd)
                return False
        except Exception:
            pass
        return True

    try:
        win32gui.EnumWindows(enum_cb, None)
    except Exception:
        pass
    return hwnds[0] if hwnds else None


def _bring_to_front(hwnd: int) -> bool:
    """AttachThreadInput + TOPMOSTトグルでウィンドウを最前面に表示"""
    if not win32gui.IsWindow(hwnd):
        return False

    # 最小化しているなら復帰
    win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)

    # 現在フォアグラウンドのスレッドに入力を"結合"して許可を取りに行く
    fg = win32gui.GetForegroundWindow()
    fg_tid = 0
    if fg:
        fg_tid, _ = win32process.GetWindowThreadProcessId(fg)
    my_tid = win32api.GetCurrentThreadId()

    try:
        if fg_tid:
            win32process.AttachThreadInput(my_tid, fg_tid, True)

        win32gui.BringWindowToTop(hwnd)
        win32gui.SetForegroundWindow(hwnd)

        # それでもダメな時の最後の一押し：TOPMOSTトグル
        win32gui.SetWindowPos(
            hwnd, win32con.HWND_TOPMOST, 0, 0, 0, 0,
            win32con.SWP_NOMOVE | win32con.SWP_NOSIZE
        )
        win32gui.SetWindowPos(
            hwnd, win32con.HWND_NOTOPMOST, 0, 0, 0, 0,
            win32con.SWP_NOMOVE | win32con.SWP_NOSIZE
        )

        return True
    except Exception as e:
        log(f"_bring_to_front error: {e}")
        return False
    finally:
        try:
            if fg_tid:
                win32process.AttachThreadInput(my_tid, fg_tid, False)
        except Exception:
            pass


def bring_window_to_front(pid: int, timeout: float = 10.0) -> bool:
    """プロセスIDからウィンドウを探して最前面に表示"""
    if not HAS_WIN32:
        return False

    end_time = time.time() + timeout
    hwnd = None

    while time.time() < end_time:
        hwnd = _find_main_window(pid)
        if hwnd:
            break
        time.sleep(0.1)

    if not hwnd:
        log("Window not found within timeout")
        return False

    if _bring_to_front(hwnd):
        log(f"Window brought to front (hwnd={hwnd})")
        return True
    else:
        log("Failed to bring window to front")
        return False


def execute_exe(task: dict[str, Any], config: dict[str, Any]) -> tuple[str, Optional[str], Optional[str]]:
    """EXEファイルを実行"""
    target = task.get("target")

    if not target:
        return "failed", None, "EXE target not configured"

    exe_path = Path(target)
    if not exe_path.exists():
        return "failed", None, f"EXE not found: {exe_path}"

    log(f"Executing EXE: {exe_path}")

    try:
        # EXEはバックグラウンドで起動（結果追跡なし）
        process = subprocess.Popen([str(exe_path)], cwd=exe_path.parent)

        # ウィンドウを最前面に表示
        if HAS_WIN32:
            bring_window_to_front(process.pid)

        return "success", "EXE launched", None
    except Exception as e:
        return "failed", None, str(e)


def _find_window_by_title(title_part: str, timeout: float = 10.0) -> Optional[int]:
    """ウィンドウタイトルの一部からウィンドウを検索"""
    if not HAS_WIN32:
        return None

    end_time = time.time() + timeout
    hwnd_found = None

    def enum_cb(hwnd: int, _: Any) -> bool:
        nonlocal hwnd_found
        if win32gui.IsWindowVisible(hwnd):
            try:
                title = win32gui.GetWindowText(hwnd)
                if title_part.lower() in title.lower():
                    hwnd_found = hwnd
                    return False
            except Exception:
                pass
        return True

    while time.time() < end_time:
        hwnd_found = None
        try:
            win32gui.EnumWindows(enum_cb, None)
        except Exception:
            pass
        if hwnd_found:
            return hwnd_found
        time.sleep(0.2)

    return None


def execute_bat(task: dict[str, Any], config: dict[str, Any], log_file: Optional[Path] = None) -> tuple[str, Optional[str], Optional[str]]:
    """BATファイルを実行"""
    target = task.get("target")

    if not target:
        return "failed", None, "BAT target not configured"

    # 環境変数を展開（%OneDrive% など）
    expanded_path = os.path.expandvars(target)
    bat_path = Path(expanded_path)

    if not bat_path.exists():
        return "failed", None, f"BAT not found: {bat_path}"

    log(f"Executing BAT: {bat_path}")

    try:
        # ログファイルがある場合は出力をキャプチャ
        if log_file:
            append_to_log(log_file, f"[Command] cmd /c {bat_path}\n")
            append_to_log(log_file, f"[Working Directory] {bat_path.parent}\n\n")
            append_to_log(log_file, "[Output]\n")

            process = subprocess.Popen(
                ["cmd", "/c", str(bat_path)],
                cwd=bat_path.parent,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
            )

            # リアルタイムで出力を読み取ってログに書き込む
            for line in process.stdout:
                append_to_log(log_file, line)

            # プロセスの完了を待つ
            timeout = config.get("execution_timeout", 3600)
            returncode = process.wait(timeout=timeout)

            if returncode == 0:
                return "success", f"BAT completed: {bat_path.name}", None
            else:
                return "failed", None, f"Exit code: {returncode}"
        else:
            # BATファイルを実行（実行後自動で閉じる）
            process = subprocess.Popen(
                ["cmd", "/c", str(bat_path)],
                cwd=bat_path.parent
            )

            return "success", f"BAT executed: {bat_path.name}", None
    except subprocess.TimeoutExpired:
        process.kill()
        return "failed", None, "Execution timed out"
    except Exception as e:
        return "failed", None, str(e)


def execute_file(task: dict[str, Any], config: dict[str, Any]) -> tuple[str, Optional[str], Optional[str]]:
    """ファイル/フォルダ/URLを開く（Excel, フォルダ, スプレッドシート等）"""
    target = task.get("target")

    if not target:
        return "failed", None, "Target not configured"

    # URLの場合はブラウザで開く
    if target.startswith("http://") or target.startswith("https://"):
        log(f"Opening URL: {target}")
        try:
            os.startfile(target)
            # URLからタイトルを抽出（Google Sheets等）
            if "docs.google.com/spreadsheets" in target:
                return "success", "Spreadsheet opened in browser", None
            return "success", "URL opened in browser", None
        except Exception as e:
            return "failed", None, str(e)

    # 環境変数を展開（%OneDrive%, %USERPROFILE% など）
    expanded_path = os.path.expandvars(target)
    target_path = Path(expanded_path)

    if not target_path.exists():
        return "failed", None, f"Path not found: {target_path}"

    is_folder = target_path.is_dir()
    log(f"Opening {'folder' if is_folder else 'file'}: {target_path}")

    try:
        # os.startfile で関連付けされたアプリで開く
        os.startfile(str(target_path))

        # ウィンドウを最前面に表示
        if HAS_WIN32:
            # フォルダ名またはファイル名（拡張子なし）でウィンドウを検索
            search_name = target_path.name if is_folder else target_path.stem
            hwnd = _find_window_by_title(search_name, timeout=10.0)
            if hwnd:
                _bring_to_front(hwnd)
                log(f"Window brought to front (hwnd={hwnd})")

        if is_folder:
            return "success", f"Folder opened: {target_path.name}", None
        else:
            return "success", f"File opened: {target_path.name}", None
    except Exception as e:
        return "failed", None, str(e)


def create_log_file(config: dict[str, Any], run_id: str, tool_name: str) -> Optional[Path]:
    """ログファイルを作成し、メタデータを書き込む"""
    log_dir = config.get("log_dir")
    if not log_dir:
        return None

    log_dir_path = Path(log_dir)
    log_dir_path.mkdir(parents=True, exist_ok=True)

    log_file = log_dir_path / f"run-{run_id}.log"
    start_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with open(log_file, "w", encoding="utf-8") as f:
        f.write("=== TC Portal Runner Log ===\n")
        f.write(f"Run ID: {run_id}\n")
        f.write(f"Tool: {tool_name}\n")
        f.write(f"Start: {start_time}\n")
        f.write("============================\n\n")

    return log_file


def append_to_log(log_file: Optional[Path], content: str) -> None:
    """ログファイルに内容を追記"""
    if log_file and content:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(content)


def finalize_log(log_file: Optional[Path], status: str) -> None:
    """ログファイルを終了"""
    if log_file:
        end_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"\n\n=== End ===\n")
            f.write(f"Finished: {end_time}\n")
            f.write(f"Status: {status}\n")


def process_task(task: dict[str, Any], config: dict[str, Any]) -> None:
    """タスクを処理"""
    run_id = task["run_id"]
    tool_type = task["tool_type"]
    tool_name = task.get("tool_name", "Unknown")

    log(f"Processing task: {tool_name} (type: {tool_type}, run_id: {run_id})")

    # ログファイルを作成
    log_file = create_log_file(config, run_id, tool_name)
    log_path: Optional[str] = str(log_file) if log_file else None

    # ツールタイプに応じた実行
    if tool_type == "python_runner":
        status, summary, error = execute_python_runner(task, config, log_file)
    elif tool_type == "pad":
        status, summary, error = execute_pad(task, config)
        if status == "running":
            # PADはコールバック待ちのため、ここでは報告しない
            log("PAD flow started, waiting for callback...")
            return
    elif tool_type == "exe":
        status, summary, error = execute_exe(task, config)
    elif tool_type in ("excel", "sheet", "folder", "bi"):
        status, summary, error = execute_file(task, config)
    elif tool_type == "bat":
        status, summary, error = execute_bat(task, config, log_file)
    else:
        status = "failed"
        summary = None
        error = f"Unsupported tool type: {tool_type}"

    # ログファイルを終了
    finalize_log(log_file, status)

    # 結果を報告
    report_result(config, run_id, status, summary, error, log_path=log_path)


def main() -> None:
    """メインループ"""
    log("TC Portal Runner Agent starting...")

    config = load_config()
    poll_interval = config.get("poll_interval_sec", 10)
    heartbeat_interval = config.get("heartbeat_interval_sec", 30)  # デフォルト30秒

    log(f"Portal URL: {config['portal_url']}")
    log(f"Poll interval: {poll_interval} seconds")
    log(f"Heartbeat interval: {heartbeat_interval} seconds")

    # 起動時にハートビートを送信
    hostname = os.environ.get("COMPUTERNAME", "unknown")
    log(f"Hostname: {hostname}")
    if send_heartbeat(config):
        log("Initial heartbeat sent successfully")
    else:
        log("Warning: Initial heartbeat failed")

    last_heartbeat = time.time()

    while True:
        try:
            # 定期的にハートビートを送信
            now = time.time()
            if now - last_heartbeat >= heartbeat_interval:
                send_heartbeat(config)
                last_heartbeat = now

            task = claim_task(config)
            if task:
                process_task(task, config)
            else:
                # タスクがない場合は待機
                pass
        except Exception as e:
            log(f"Error in main loop: {e}")

        time.sleep(poll_interval)


if __name__ == "__main__":
    main()
