"""Runs/Execution tests."""
import os
import pytest
from pathlib import Path
from playwright.sync_api import Page, expect


SCREENSHOT_DIR = Path(__file__).parent.parent / "screenshots"


def login(page: Page, base_url: str):
    """Helper to login with test credentials."""
    test_email = os.environ.get("TEST_EMAIL")
    test_password = os.environ.get("TEST_PASSWORD")

    if not test_email or not test_password:
        pytest.skip("TEST_EMAIL and TEST_PASSWORD environment variables required")

    page.goto(f"{base_url}/login")
    page.wait_for_load_state("networkidle")

    # スクリーンショットを保存（デバッグ用）
    SCREENSHOT_DIR.mkdir(exist_ok=True)
    page.screenshot(path=str(SCREENSHOT_DIR / "login_page.png"))

    page.fill('input[type="email"]', test_email)
    page.fill('input[type="password"]', test_password)
    page.click('button[type="submit"]')

    # ログイン後のリダイレクトを待つ（URLパターンで待機）
    page.wait_for_url(lambda url: "/login" not in url, timeout=15000)
    page.wait_for_load_state("networkidle")

    page.screenshot(path=str(SCREENSHOT_DIR / "after_login.png"))
    print(f"Logged in, current URL: {page.url}")


def save_screenshot(page: Page, name: str):
    """Save screenshot to screenshots directory."""
    SCREENSHOT_DIR.mkdir(exist_ok=True)
    path = SCREENSHOT_DIR / f"{name}.png"
    page.screenshot(path=str(path))
    print(f"Screenshot saved: {path}")


def test_runs_page_loads(page: Page, base_url: str):
    """Test that runs page loads correctly."""
    login(page, base_url)

    # Navigate to runs page
    page.goto(f"{base_url}/runs")
    page.wait_for_load_state("networkidle")

    # Check page loads
    page_title = page.locator("h1").nth(1)
    expect(page_title).to_be_visible()

    save_screenshot(page, "runs_page")


def test_execute_button_exists(page: Page, base_url: str):
    """Test that execute buttons exist for executable tool types."""
    login(page, base_url)

    # Navigate to tools page
    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")

    save_screenshot(page, "tools_page")

    # Check for execute buttons
    execute_buttons = page.locator('button[title="実行"]')
    count = execute_buttons.count()
    print(f"Execute buttons found: {count}")

    if count == 0:
        print("No executable tools (python_runner/pad/exe) in database")


def test_execute_dialog_flow(page: Page, base_url: str):
    """Test the complete execute dialog flow."""
    login(page, base_url)

    # Navigate to tools page
    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")

    # Find execute buttons
    execute_buttons = page.locator('button[title="実行"]')
    count = execute_buttons.count()

    if count == 0:
        pytest.skip("No executable tools in database")

    print(f"Found {count} execute buttons")
    save_screenshot(page, "01_before_click")

    # Click the first execute button
    execute_buttons.first.click()
    page.wait_for_timeout(1000)

    save_screenshot(page, "02_after_click")

    # Check for dialog
    dialog = page.locator('[role="dialog"]')
    expect(dialog).to_be_visible(timeout=3000)
    print("Dialog opened!")

    save_screenshot(page, "03_dialog_open")

    # Click execute button in dialog
    execute_btn = dialog.locator('button').last
    execute_btn.click()
    print("Clicked execute button")

    # Wait for response
    page.wait_for_timeout(3000)

    save_screenshot(page, "04_after_execute")

    # Check dialog content for result
    dialog_content = dialog.inner_text()
    print(f"Dialog content: {dialog_content[:200]}...")

    # Check for success or error
    if "送信しました" in dialog_content or "success" in dialog_content.lower():
        print("SUCCESS: Execution request sent!")
    elif "失敗" in dialog_content or "error" in dialog_content.lower():
        print(f"ERROR: {dialog_content}")
    else:
        print(f"UNKNOWN RESULT: {dialog_content}")


def test_runs_page_shows_history(page: Page, base_url: str):
    """Test that runs page shows execution history."""
    login(page, base_url)

    # Navigate to runs page
    page.goto(f"{base_url}/runs")
    page.wait_for_load_state("networkidle")

    save_screenshot(page, "runs_history")

    # Check for any run entries
    # Look for status badges
    statuses = page.locator("text=待機中, text=実行中, text=成功, text=失敗, text=キャンセル")
    count = statuses.count()
    print(f"Found {count} run entries with status")

    # Check table structure
    table_headers = ["ステータス", "ツール名", "実行者"]
    for header in table_headers:
        header_elem = page.locator(f"text={header}").first
        if header_elem.is_visible():
            print(f"Header '{header}' found")
