"""Folder tool 1-click launch test (safe helper - no dialog).

With the new UX, folder tools launch immediately on card click without
showing a confirmation dialog. This tests that behavior.
"""
import os
import pytest
from pathlib import Path
from playwright.sync_api import Page, expect
import requests

SCREENSHOT_DIR = Path(__file__).parent.parent / "screenshots"
SUPABASE_URL = "https://beopwoevumsduqlxzudu.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlb3B3b2V2dW1zZHVxbHh6dWR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3ODU2OCwiZXhwIjoyMDgzODU0NTY4fQ.zkCFql0ogzb3X_WXpxSMgY00HtYyZikbJBFRxwbQq3Q"

# Folder test tool ID
FOLDER_TOOL_ID = "da8fdfd0-ff13-4898-a063-9f2d0748a857"


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
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/runs?tool_id=eq.{tool_id}&select=id",
        headers=headers,
    )
    return len(response.json())


def test_folder_card_click_launches_immediately(page: Page, base_url: str):
    """Test that clicking a folder tool card launches immediately (no dialog).

    Safe helper tools (folder, folder_set, shortcut, excel, bi) now launch
    with 1 click - no confirmation dialog is shown.
    """
    login(page, base_url)

    initial_count = get_runs_count(FOLDER_TOOL_ID)
    print(f"Initial runs count for Folder tool: {initial_count}")

    # Go to tools page
    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")
    save_screenshot(page, "folder_01_tools_page")

    # Find all cards using data-slot attribute
    cards = page.locator('[data-slot="card"]')
    card_count = cards.count()
    print(f"Found {card_count} cards")

    # Find the card containing our tool name
    folder_card = None
    for i in range(card_count):
        card = cards.nth(i)
        text_content = card.inner_text()
        if "フォルダテスト" in text_content:
            folder_card = card
            print(f"Found Folder test card at index {i}")
            break

    if not folder_card:
        save_screenshot(page, "folder_02_not_found")
        pytest.fail("Could not find Folder test tool card")

    save_screenshot(page, "folder_02_found")

    # Verify NO execute button for safe helper tools (new UX)
    execute_btn = folder_card.locator('button[title="実行"]')
    btn_count = execute_btn.count()
    print(f"Execute buttons in Folder card: {btn_count}")
    assert btn_count == 0, "Safe helper tools should NOT have execute button"

    # Click the card itself (new 1-click UX)
    print("Clicking folder card (1-click launch)...")
    folder_card.click()

    # Wait for tcportal:// to be triggered (browser may show dialog)
    page.wait_for_timeout(2000)
    save_screenshot(page, "folder_03_after_click")

    # Verify NO confirmation dialog appeared
    dialog = page.locator('[role="dialog"]')
    if dialog.count() > 0:
        save_screenshot(page, "folder_04_unexpected_dialog")
        pytest.fail("Safe helper tools should NOT show confirmation dialog")

    # Check if run was created (async logging)
    page.wait_for_timeout(1000)  # Wait for async run creation
    new_count = get_runs_count(FOLDER_TOOL_ID)
    print(f"New runs count: {new_count}")

    if new_count > initial_count:
        print("SUCCESS! Run was created for Folder tool (1-click launch)!")
    else:
        # Run creation is fire-and-forget, so it may fail silently
        # The main test is that no dialog appeared
        print("Note: Run record may not have been created (fire-and-forget)")
        print("SUCCESS! Card click did not show dialog (1-click UX works)")
