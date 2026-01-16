#!/usr/bin/env python3
"""
TC Portal Windows Helper

tcportal:// URLスキームを受け取り、ローカルでアプリやフォルダを開く。

使用例:
  tcportal://open?payload=eyJhY3Rpb24iOiJvcGVuX2ZvbGRlciIsInBhdGgiOiJDOlxcVXNlcnMifQ==
"""

import sys
import os
import json
import base64
import subprocess
import webbrowser
import time
import ctypes
from ctypes import wintypes
from urllib.parse import urlparse, parse_qs, unquote
from typing import Any
from datetime import datetime

# Win32 constants
WM_COMMAND = 0x0111
NEW_TAB_COMMAND = 0xA21B  # Undocumented: creates new tab in Explorer

# ログファイルパス
LOG_FILE = None


def get_log_path() -> str:
    """ログファイルのパスを取得"""
    if getattr(sys, 'frozen', False):
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "tcportal-helper.log")


def get_config_path() -> str:
    """設定ファイルのパスを取得"""
    if getattr(sys, 'frozen', False):
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "config.json")


def load_config() -> dict[str, Any]:
    """設定ファイルを読み込む"""
    config_path = get_config_path()
    default_config = {
        "folder_set_mode": "tabs_prefer",  # "tabs_prefer" or "windows"
        "tab_create_wait_ms": 500,         # タブ作成後の待機時間
        "navigate_wait_ms": 300,           # Navigate2後の待機時間
        "poll_interval_ms": 100,           # ShellWindows ポーリング間隔
        "poll_timeout_ms": 3000,           # ShellWindows ポーリングタイムアウト
    }

    try:
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                user_config = json.load(f)
                return {**default_config, **user_config}
    except Exception as e:
        log(f"Config load error (using defaults): {e}")

    return default_config


def log(message: str) -> None:
    """ログ出力（コンソール + ファイル）"""
    global LOG_FILE
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    line = f"[{timestamp}] {message}"
    print(line)

    # ファイルにも出力
    try:
        if LOG_FILE is None:
            LOG_FILE = get_log_path()
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def expand_env_vars(path: str) -> str:
    """環境変数を展開（%OneDrive% など）"""
    return os.path.expandvars(path)


def parse_payload(payload_b64: str) -> dict[str, Any]:
    """Base64URLエンコードされたpayloadをパース"""
    try:
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        payload_b64 = unquote(payload_b64)
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(payload_bytes.decode("utf-8"))
    except Exception as e:
        log(f"Payload parse error: {e}")
        return {}


# =============================================================================
# Win32 API Functions (ctypes)
# =============================================================================

def get_foreground_window() -> int:
    """フォアグラウンドウィンドウのハンドルを取得"""
    user32 = ctypes.windll.user32
    return user32.GetForegroundWindow()


def get_window_class(hwnd: int) -> str:
    """ウィンドウのクラス名を取得"""
    user32 = ctypes.windll.user32
    buffer = ctypes.create_unicode_buffer(256)
    user32.GetClassNameW(hwnd, buffer, 256)
    return buffer.value


def find_child_window(parent_hwnd: int, class_name: str) -> int | None:
    """指定したクラス名の子ウィンドウを検索"""
    user32 = ctypes.windll.user32
    result = [None]

    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def enum_callback(hwnd, lparam):
        if get_window_class(hwnd) == class_name:
            result[0] = hwnd
            return False
        return True

    user32.EnumChildWindows(parent_hwnd, enum_callback, 0)
    return result[0]


def send_message(hwnd: int, msg: int, wparam: int, lparam: int) -> int:
    """ウィンドウにメッセージを送信"""
    user32 = ctypes.windll.user32
    return user32.SendMessageW(hwnd, msg, wparam, lparam)


def set_foreground_window(hwnd: int) -> bool:
    """ウィンドウをフォアグラウンドに設定"""
    user32 = ctypes.windll.user32
    return bool(user32.SetForegroundWindow(hwnd))


# =============================================================================
# COM ShellWindows Functions
# =============================================================================

def get_shell_windows():
    """ShellWindows COMオブジェクトを取得"""
    try:
        import win32com.client
        shell = win32com.client.Dispatch("Shell.Application")
        return shell.Windows()
    except Exception as e:
        log(f"[COM] Failed to get ShellWindows: {e}")
        return None


def shellwindows_snapshot() -> list[dict]:
    """
    現在のShellWindowsの詳細スナップショットを取得
    Returns: list of {hwnd, location_url, location_name, full_name}
    """
    windows = get_shell_windows()
    if not windows:
        return []

    snapshot = []
    try:
        count = windows.Count
        log(f"[COM] ShellWindows.Count = {count}")
        for i in range(count):
            try:
                window = windows.Item(i)
                if window:
                    info = {
                        "index": i,
                        "hwnd": window.HWND,
                        "location_url": getattr(window, "LocationURL", "") or "",
                        "location_name": getattr(window, "LocationName", "") or "",
                        "full_name": getattr(window, "FullName", "") or "",
                        "window_obj": window,
                    }
                    snapshot.append(info)
                    log(f"[COM]   [{i}] hwnd={info['hwnd']}, loc={info['location_url']}, name={info['location_name']}")
            except Exception as e:
                log(f"[COM]   [{i}] Error accessing item: {e}")
    except Exception as e:
        log(f"[COM] Error iterating ShellWindows: {e}")

    return snapshot


def find_new_tab_view(before_snapshot: list[dict], target_hwnd: int, config: dict):
    """
    新しく追加されたタブビューを検出

    新しいタブは親ウィンドウと同じHWNDを持つが、LocationURLが空（ホームタブ）
    before_snapshotにない新しい項目を探す
    """
    poll_interval = config.get("poll_interval_ms", 100) / 1000.0
    timeout = config.get("poll_timeout_ms", 3000) / 1000.0

    # before_snapshotの項目を (hwnd, location_url) のセットで記録
    before_keys = {(info["hwnd"], info["location_url"]) for info in before_snapshot}
    before_count = len(before_snapshot)

    start_time = time.time()
    attempt = 0

    log(f"[COM] Polling for new tab (timeout={timeout}s, interval={poll_interval}s)")
    log(f"[COM] Before count: {before_count}, target_hwnd: {target_hwnd}")
    log(f"[COM] Before keys: {before_keys}")

    while time.time() - start_time < timeout:
        attempt += 1
        windows = get_shell_windows()
        if not windows:
            time.sleep(poll_interval)
            continue

        try:
            current_count = windows.Count

            # カウントが増えていれば新しいタブが追加された可能性
            if current_count > before_count:
                log(f"[COM] Attempt {attempt}: Count increased {before_count} -> {current_count}")

                for i in range(current_count):
                    try:
                        window = windows.Item(i)
                        if window:
                            hwnd = window.HWND
                            loc_url = getattr(window, "LocationURL", "") or ""
                            loc_name = getattr(window, "LocationName", "") or ""
                            key = (hwnd, loc_url)

                            # 新しい項目で、ターゲットウィンドウのHWNDを持ち、LocationURLが空（ホームタブ）
                            if key not in before_keys:
                                log(f"[COM] Attempt {attempt}: Found NEW item! hwnd={hwnd}, loc={loc_url}, name={loc_name}")

                                # ターゲットのExplorerウィンドウに属するホームタブを優先
                                if hwnd == target_hwnd and loc_url == "":
                                    log(f"[COM] This is a new Home tab in target window - using it!")
                                    return window

                                # それ以外の新しい項目も候補として記録
                                # （最初に見つかった新しいホームタブを返す）
                                if loc_url == "" and loc_name == "ホーム":
                                    log(f"[COM] Found Home tab (different hwnd) - using it!")
                                    return window
                    except Exception as e:
                        log(f"[COM] Attempt {attempt}: Error accessing item {i}: {e}")

        except Exception as e:
            log(f"[COM] Attempt {attempt}: Error during polling: {e}")

        time.sleep(poll_interval)

    log(f"[COM] Polling timeout after {attempt} attempts")
    return None


def navigate_view(view, path: str, config: dict) -> bool:
    """
    viewに対してNavigate2を実行
    """
    navigate_wait = config.get("navigate_wait_ms", 300) / 1000.0

    try:
        log(f"[COM] Calling Navigate2('{path}')")
        view.Navigate2(path)
        time.sleep(navigate_wait)

        # 確認
        loc_url = getattr(view, "LocationURL", "") or ""
        loc_name = getattr(view, "LocationName", "") or ""
        log(f"[COM] After Navigate2: loc_url={loc_url}, loc_name={loc_name}")

        return True
    except Exception as e:
        log(f"[COM] Navigate2 failed: {e}")
        return False


# =============================================================================
# Tab Opening Logic
# =============================================================================

def open_folders_in_tabs(paths: list[str], config: dict) -> tuple[int, int]:
    """
    複数フォルダを同一Explorerウィンドウのタブで開く

    Returns:
        tuple[int, int]: (tabs_opened, windows_fallback)
    """
    if not paths:
        return (0, 0)

    tabs_opened = 0
    windows_fallback = 0
    tab_create_wait = config.get("tab_create_wait_ms", 500) / 1000.0

    # === 1. 最初のフォルダを新規Explorerウィンドウで開く ===
    first_path = expand_env_vars(paths[0])
    log(f"[TAB] Opening first folder: {first_path}")

    try:
        subprocess.Popen(["explorer.exe", first_path])
        tabs_opened += 1
        log(f"[TAB] First folder opened via explorer.exe")

        # ウィンドウが開くのを待つ
        time.sleep(0.8)

    except Exception as e:
        log(f"[TAB] Failed to open first folder: {e}")
        try:
            os.startfile(first_path)
            windows_fallback += 1
        except Exception:
            pass
        # 残りもフォールバック
        for p in paths[1:]:
            p = expand_env_vars(p)
            try:
                os.startfile(p)
                windows_fallback += 1
            except Exception:
                pass
        return (tabs_opened, windows_fallback)

    # === 2. 残りのフォルダをタブで開く ===
    for idx, path in enumerate(paths[1:], start=2):
        path = expand_env_vars(path)
        log(f"")
        log(f"[TAB] === Processing folder #{idx}: {path} ===")

        try:
            # 2a. フォアグラウンドウィンドウを取得
            explorer_hwnd = get_foreground_window()
            explorer_class = get_window_class(explorer_hwnd)
            log(f"[WIN] Foreground: hwnd={explorer_hwnd}, class={explorer_class}")

            if explorer_class != "CabinetWClass":
                log(f"[WIN] Not an Explorer window, fallback")
                os.startfile(path)
                windows_fallback += 1
                continue

            # 2b. ShellTabWindowClass を検索
            tab_hwnd = find_child_window(explorer_hwnd, "ShellTabWindowClass")
            log(f"[WIN] ShellTabWindowClass hwnd: {tab_hwnd}")

            if not tab_hwnd:
                log(f"[WIN] ShellTabWindowClass not found (tabs not supported?), fallback")
                os.startfile(path)
                windows_fallback += 1
                continue

            # 2c. 現在のShellWindowsスナップショットを取得
            log(f"[COM] Taking BEFORE snapshot...")
            before_snapshot = shellwindows_snapshot()

            # 2d. 新規タブを作成
            log(f"[WIN] Sending WM_COMMAND 0xA21B to tab_hwnd={tab_hwnd}")
            result = send_message(tab_hwnd, WM_COMMAND, NEW_TAB_COMMAND, 0)
            log(f"[WIN] SendMessage result: {result}")

            # タブ作成を待つ
            log(f"[TAB] Waiting {tab_create_wait}s for tab creation...")
            time.sleep(tab_create_wait)

            # 2e. 新しいタブビューを検出（同じHWNDでLocationURLが空の新項目）
            log(f"[COM] Finding new tab view...")
            new_view = find_new_tab_view(before_snapshot, explorer_hwnd, config)

            if not new_view:
                log(f"[COM] Could not find new view, fallback")
                os.startfile(path)
                windows_fallback += 1
                continue

            # 2f. Navigate2でフォルダを開く
            if navigate_view(new_view, path, config):
                tabs_opened += 1
                log(f"[TAB] Successfully opened in tab: {path}")
            else:
                log(f"[COM] Navigate2 failed, fallback")
                os.startfile(path)
                windows_fallback += 1

        except Exception as e:
            log(f"[TAB] Exception: {e}, fallback")
            try:
                os.startfile(path)
                windows_fallback += 1
            except Exception as e2:
                log(f"[TAB] Fallback also failed: {e2}")

    return (tabs_opened, windows_fallback)


def open_folders_in_windows(paths: list[str]) -> int:
    """複数フォルダを別ウィンドウで開く（従来方式）"""
    count = 0
    for path in paths:
        path = expand_env_vars(path)
        try:
            os.startfile(path)
            count += 1
            log(f"[WIN] Opened in separate window: {path}")
        except Exception as e:
            log(f"[WIN] Failed to open: {path}, error: {e}")
    return count


# =============================================================================
# Main Actions
# =============================================================================

def open_file(path: str) -> None:
    """ファイルを開く"""
    path = expand_env_vars(path)
    log(f"Opening file: {path}")
    os.startfile(path)


def open_folder(path: str) -> None:
    """フォルダを開く"""
    path = expand_env_vars(path)
    log(f"Opening folder: {path}")
    os.startfile(path)


def open_folders(paths: list[str]) -> None:
    """複数フォルダを開く（設定に応じてタブまたは別ウィンドウ）"""
    config = load_config()
    mode = config.get("folder_set_mode", "tabs_prefer")

    log(f"")
    log(f"========================================")
    log(f"open_folders called")
    log(f"  mode: {mode}")
    log(f"  paths: {paths}")
    log(f"  config: {config}")
    log(f"========================================")

    if mode == "windows":
        count = open_folders_in_windows(paths)
        log(f"[RESULT] windows_opened={count}")
    else:
        try:
            tabs_opened, windows_fallback = open_folders_in_tabs(paths, config)
            log(f"")
            log(f"[RESULT] tabs_opened={tabs_opened}, windows_fallback={windows_fallback}")
        except Exception as e:
            log(f"[RESULT] Tab mode failed completely: {e}")
            count = open_folders_in_windows(paths)
            log(f"[RESULT] Full fallback: windows_opened={count}")


def run_exe(path: str) -> None:
    """EXEを実行"""
    path = expand_env_vars(path)
    log(f"Running EXE: {path}")
    subprocess.Popen([path], creationflags=subprocess.CREATE_NEW_CONSOLE)


def run_bat(path: str) -> None:
    """BATファイルを実行"""
    path = expand_env_vars(path)
    log(f"Running BAT: {path}")
    subprocess.Popen(["cmd", "/c", path], creationflags=subprocess.CREATE_NEW_CONSOLE)


def open_shortcut(path: str) -> None:
    """ショートカットを実行"""
    path = expand_env_vars(path)
    log(f"Opening shortcut: {path}")
    os.startfile(path)


def open_url(url: str) -> None:
    """URLを開く"""
    log(f"Opening URL: {url}")
    webbrowser.open(url)


def process_payload(payload: dict[str, Any]) -> None:
    """payloadを処理"""
    action = payload.get("action")

    if not action:
        log("No action specified")
        return

    log(f"Action: {action}")

    if action == "open_file":
        path = payload.get("path")
        if path:
            open_file(path)

    elif action == "open_folder":
        path = payload.get("path")
        if path:
            open_folder(path)

    elif action == "open_folders":
        paths = payload.get("paths", [])
        if paths:
            open_folders(paths)

    elif action == "run_exe":
        path = payload.get("path")
        if path:
            run_exe(path)

    elif action == "run_bat":
        path = payload.get("path")
        if path:
            run_bat(path)

    elif action == "open_shortcut":
        path = payload.get("path")
        if path:
            open_shortcut(path)

    elif action == "open_url":
        url = payload.get("url")
        if url:
            open_url(url)

    else:
        log(f"Unknown action: {action}")


def main() -> None:
    """メイン処理"""
    log(f"")
    log(f"=== TC Portal Helper Started ===")
    log(f"Args: {sys.argv}")

    if len(sys.argv) < 2:
        log("No URL argument provided")
        return

    url = sys.argv[1]
    log(f"Received URL: {url}")

    try:
        parsed = urlparse(url)

        if parsed.scheme != "tcportal":
            log(f"Invalid scheme: {parsed.scheme}")
            return

        params = parse_qs(parsed.query)
        payload_b64 = params.get("payload", [""])[0]

        if not payload_b64:
            log("No payload in URL")
            return

        payload = parse_payload(payload_b64)

        if payload:
            process_payload(payload)
        else:
            log("Failed to parse payload")

    except Exception as e:
        log(f"Error: {e}")


if __name__ == "__main__":
    main()
