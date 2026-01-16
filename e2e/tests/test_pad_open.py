"""PAD (Power Automate Desktop) flow execution test."""
import os
import pytest
from pathlib import Path
from playwright.sync_api import Page
import requests

SCREENSHOT_DIR = Path(__file__).parent.parent / "screenshots"
SUPABASE_URL = "https://beopwoevumsduqlxzudu.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlb3B3b2V2dW1zZHVxbHh6dWR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3ODU2OCwiZXhwIjoyMDgzODU0NTY4fQ.zkCFql0ogzb3X_WXpxSMgY00HtYyZikbJBFRxwbQq3Q"

# PAD test tool ID
PAD_TOOL_ID = "fe9fe1d7-61c9-4992-91ef-5b4a2c06977e"


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


def test_click_pad_execute_button(page: Page, base_url: str):
    """Test clicking the PAD tool's execute button."""
    login(page, base_url)

    initial_count = get_runs_count(PAD_TOOL_ID)
    print(f"Initial runs count for PAD tool: {initial_count}")

    # Go to tools page
    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")
    save_screenshot(page, "pad_01_tools_page")

    # Find all cards using data-slot attribute
    cards = page.locator('[data-slot="card"]')
    card_count = cards.count()
    print(f"Found {card_count} cards")

    # Find the card containing our tool name
    pad_card = None
    for i in range(card_count):
        card = cards.nth(i)
        text_content = card.inner_text()
        if "PADテスト" in text_content:
            pad_card = card
            print(f"Found PAD test card at index {i}")
            break

    if not pad_card:
        save_screenshot(page, "pad_02_not_found")
        pytest.fail("Could not find PAD test tool card")

    save_screenshot(page, "pad_02_found")

    # Find the execute button within this card
    execute_btn = pad_card.locator('button[title="実行"]')
    btn_count = execute_btn.count()
    print(f"Execute buttons in PAD card: {btn_count}")

    if btn_count == 0:
        all_buttons = pad_card.locator('button')
        print(f"All buttons in card: {all_buttons.count()}")
        for i in range(all_buttons.count()):
            btn = all_buttons.nth(i)
            print(f"Button {i}: title={btn.get_attribute('title')}, text={btn.inner_text()}")
        save_screenshot(page, "pad_03_no_button")
        pytest.fail("No execute button in PAD card")

    # Click the button
    print("Clicking execute button...")
    execute_btn.first.click()

    # Wait for action
    page.wait_for_timeout(3000)
    save_screenshot(page, "pad_04_after_click")

    # Check if run was created
    new_count = get_runs_count(PAD_TOOL_ID)
    print(f"New runs count: {new_count}")

    if new_count > initial_count:
        print("Run was created! Waiting for runner to process...")

        # Wait for runner to complete (up to 30 seconds)
        for _ in range(15):
            page.wait_for_timeout(2000)
            latest = get_latest_run(PAD_TOOL_ID)
            print(f"Latest run status: {latest.get('status')}")
            if latest.get('status') in ('success', 'failed'):
                break

        latest = get_latest_run(PAD_TOOL_ID)
        if latest.get('status') == 'success':
            print(f"SUCCESS! PAD flow started: {latest.get('summary')}")
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
