"""Python script execution test."""
import os
import pytest
from pathlib import Path
from playwright.sync_api import Page
import requests

SCREENSHOT_DIR = Path(__file__).parent.parent / "screenshots"
SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Python test tool ID (venv直接実行形式)
PYTHON_TOOL_ID = "f0c3510c-cef0-4b33-a937-87c16a8ee4c2"


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


def get_latest_run(tool_id: str) -> dict:
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


def test_click_python_execute_button(page: Page, base_url: str):
    """Test clicking the Python tool's execute button."""
    login(page, base_url)

    initial_count = get_runs_count(PYTHON_TOOL_ID)
    print(f"Initial runs count for Python tool: {initial_count}")

    # Go to tools page
    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")
    save_screenshot(page, "python_01_tools_page")

    # Find all cards using data-slot attribute
    cards = page.locator('[data-slot="card"]')
    card_count = cards.count()
    print(f"Found {card_count} cards")

    # Find the card containing our tool name
    python_card = None
    for i in range(card_count):
        card = cards.nth(i)
        text_content = card.inner_text()
        if "Pythonテスト（venv直接）" in text_content:
            python_card = card
            print(f"Found Python test card at index {i}")
            break

    if not python_card:
        save_screenshot(page, "python_02_not_found")
        pytest.fail("Could not find Python test tool card")

    save_screenshot(page, "python_02_found")

    # Find the execute button within this card
    execute_btn = python_card.locator('button[title="実行"]')
    btn_count = execute_btn.count()
    print(f"Execute buttons in Python card: {btn_count}")

    if btn_count == 0:
        all_buttons = python_card.locator('button')
        print(f"All buttons in card: {all_buttons.count()}")
        for i in range(all_buttons.count()):
            btn = all_buttons.nth(i)
            print(f"Button {i}: title={btn.get_attribute('title')}, text={btn.inner_text()}")
        save_screenshot(page, "python_03_no_button")
        pytest.fail("No execute button in Python card")

    # Click the button to open confirmation dialog
    print("Clicking execute button...")
    execute_btn.first.click()

    # Wait for dialog to appear
    page.wait_for_timeout(500)
    save_screenshot(page, "python_04_dialog_open")

    # Click the confirm button in the dialog
    confirm_btn = page.locator('button:has-text("実行する")')
    if confirm_btn.count() > 0:
        print("Clicking confirm button in dialog...")
        confirm_btn.first.click()
    else:
        save_screenshot(page, "python_04_no_confirm_btn")
        pytest.fail("Confirm button not found in dialog")

    # Wait for action
    page.wait_for_timeout(3000)
    save_screenshot(page, "python_05_after_confirm")

    # Check if run was created
    new_count = get_runs_count(PYTHON_TOOL_ID)
    print(f"New runs count: {new_count}")

    if new_count > initial_count:
        print("Run was created! Waiting for runner to process...")

        # Wait for runner to complete (up to 60 seconds for Python scripts)
        for _ in range(30):
            page.wait_for_timeout(2000)
            latest = get_latest_run(PYTHON_TOOL_ID)
            print(f"Latest run status: {latest.get('status')}")
            if latest.get('status') in ('success', 'failed'):
                break

        latest = get_latest_run(PYTHON_TOOL_ID)
        if latest.get('status') == 'success':
            print(f"SUCCESS! Python script executed: {latest.get('summary')}")
        else:
            pytest.fail(f"Run did not succeed. Status: {latest.get('status')}, Error: {latest.get('error_message')}")
    else:
        headers = {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        }
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/runs?order=requested_at.desc&limit=5&select=id,tool_id,status,error_message",
            headers=headers,
        )
        latest = response.json()
        print(f"Latest runs: {latest}")
        pytest.fail(f"No run created. Initial: {initial_count}, New: {new_count}")
