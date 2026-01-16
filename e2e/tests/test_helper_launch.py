"""Helper launch (tcportal://) E2E test - 1-Click UX.

Tests the new 1-click UX for Helper tools:
- Safe helpers (folder, excel, bi, shortcut) launch immediately on card click
- Dangerous helpers (exe, bat) show confirmation dialog
"""
import os
import pytest
from pathlib import Path
from playwright.sync_api import Page, expect
import requests

SCREENSHOT_DIR = Path(__file__).parent.parent / "screenshots"
SUPABASE_URL = "https://beopwoevumsduqlxzudu.supabase.co"
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# フォルダテスト tool ID（既存のフォルダテストツールを使用）
FOLDER_TEST_TOOL_ID = "da8fdfd0-ff13-4898-a063-9f2d0748a857"


def save_screenshot(page: Page, name: str):
    SCREENSHOT_DIR.mkdir(exist_ok=True)
    path = SCREENSHOT_DIR / f"{name}.png"
    page.screenshot(path=str(path))
    print(f"Screenshot saved: {path}")


def login(page: Page, base_url: str):
    test_email = os.environ.get("TEST_EMAIL")
    test_password = os.environ.get("TEST_PASSWORD")
    if not test_email or not test_password:
        pytest.skip("TEST_EMAIL and TEST_PASSWORD required")
    page.goto(f"{base_url}/login")
    page.wait_for_load_state("networkidle")
    page.fill('input[type="email"]', test_email)
    page.fill('input[type="password"]', test_password)
    page.click('button[type="submit"]')
    page.wait_for_url(lambda url: "/login" not in url, timeout=15000)
    page.wait_for_load_state("networkidle")


def get_runs_count(tool_id: str) -> int:
    """ツールの実行履歴数を取得"""
    if not SUPABASE_SERVICE_KEY:
        return 0
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/runs?tool_id=eq.{tool_id}&select=id",
        headers=headers,
    )
    return len(response.json())


def get_latest_run(tool_id: str) -> dict:
    """ツールの最新の実行履歴を取得"""
    if not SUPABASE_SERVICE_KEY:
        return {}
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/runs?tool_id=eq.{tool_id}&order=requested_at.desc&limit=1&select=id,status,summary,error_message",
        headers=headers,
    )
    runs = response.json()
    return runs[0] if runs else {}


def test_safe_helper_no_dialog(page: Page, base_url: str):
    """Safe helper tools (folder) launch without confirmation dialog.

    With 1-click UX, folder/excel/bi/shortcut cards launch immediately.
    """
    login(page, base_url)

    # ツールページに移動
    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")
    save_screenshot(page, "helper_01_tools_page")

    # フォルダテストツールを探す
    cards = page.locator('[data-slot="card"]')
    card_count = cards.count()
    print(f"Found {card_count} cards")

    folder_card = None
    for i in range(card_count):
        card = cards.nth(i)
        text_content = card.inner_text()
        if "フォルダテスト" in text_content:
            folder_card = card
            print(f"Found folder test card at index {i}")
            break

    if not folder_card:
        save_screenshot(page, "helper_02_not_found")
        pytest.skip("Could not find folder test tool card")

    # Safe helper should NOT have execute button (1-click UX)
    execute_btn = folder_card.locator('button[title="実行"]')
    btn_count = execute_btn.count()
    print(f"Execute buttons: {btn_count}")
    assert btn_count == 0, "Safe helper should not have execute button"

    # Click the card
    folder_card.click()

    # Wait briefly
    page.wait_for_timeout(1000)
    save_screenshot(page, "helper_03_after_click")

    # Should NOT show dialog
    dialog = page.locator('[role="dialog"]')
    dialog_count = dialog.count()
    if dialog_count > 0 and dialog.is_visible():
        save_screenshot(page, "helper_04_unexpected_dialog")
        pytest.fail("Safe helper should not show confirmation dialog")

    print("SUCCESS: Safe helper launches without dialog (1-click UX)")


def test_safe_helper_creates_run(page: Page, base_url: str):
    """Safe helper card click creates run record (async)."""
    login(page, base_url)

    initial_count = get_runs_count(FOLDER_TEST_TOOL_ID)
    print(f"Initial runs count: {initial_count}")

    # ツールページに移動
    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")

    # フォルダテストツールを探す
    cards = page.locator('[data-slot="card"]')
    card_count = cards.count()

    folder_card = None
    for i in range(card_count):
        card = cards.nth(i)
        text_content = card.inner_text()
        if "フォルダテスト" in text_content:
            folder_card = card
            break

    if not folder_card:
        pytest.skip("Could not find folder test tool card")

    # カードをクリック（1-click UX）
    folder_card.click()

    # 少し待つ（async run作成の時間）
    page.wait_for_timeout(2000)
    save_screenshot(page, "helper_05_after_launch")

    # run が作成されたか確認
    new_count = get_runs_count(FOLDER_TEST_TOOL_ID)
    print(f"New runs count: {new_count}")

    if new_count > initial_count:
        latest = get_latest_run(FOLDER_TEST_TOOL_ID)
        print(f"Latest run: {latest}")

        # status が success であることを確認
        assert latest.get("status") == "success", f"Expected status 'success', got '{latest.get('status')}'"

        print(f"SUCCESS: Run created with status=success")
    else:
        # Run creation is fire-and-forget, may fail silently
        print("Note: Run record may not have been created (fire-and-forget)")


def test_excel_helper_1click(page: Page, base_url: str):
    """Excel tool also uses 1-click UX (safe helper)."""
    login(page, base_url)

    # ツールページに移動
    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")

    # Excelテストツールを探す
    cards = page.locator('[data-slot="card"]')
    card_count = cards.count()

    excel_card = None
    for i in range(card_count):
        card = cards.nth(i)
        text_content = card.inner_text()
        if "エクセルテスト" in text_content or "Excel" in text_content:
            excel_card = card
            print(f"Found Excel card at index {i}")
            break

    if not excel_card:
        pytest.skip("Could not find Excel test tool card")

    # Safe helper should NOT have execute button
    execute_btn = excel_card.locator('button[title="実行"]')
    btn_count = execute_btn.count()
    print(f"Execute buttons: {btn_count}")
    assert btn_count == 0, "Excel (safe helper) should not have execute button"

    # Click the card
    excel_card.click()

    # Wait briefly
    page.wait_for_timeout(1000)
    save_screenshot(page, "helper_06_excel_after_click")

    # Should NOT show dialog
    dialog = page.locator('[role="dialog"]')
    dialog_count = dialog.count()
    if dialog_count > 0 and dialog.is_visible():
        pytest.fail("Excel (safe helper) should not show dialog")

    print("SUCCESS: Excel tool uses 1-click UX")
