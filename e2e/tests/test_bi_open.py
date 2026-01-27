"""BI (Power BI) tool execution test."""
import os
import pytest
from pathlib import Path
from playwright.sync_api import Page, expect
import requests

SCREENSHOT_DIR = Path(__file__).parent.parent / "screenshots"
SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# BI test tool ID
BI_TOOL_ID = "78ba8dc4-8b2c-49cd-9866-35c09d8501b4"


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


def test_click_bi_execute_button(page: Page, base_url: str):
    """Test clicking the BI tool's execute button."""
    login(page, base_url)

    initial_count = get_runs_count(BI_TOOL_ID)
    print(f"Initial runs count for BI tool: {initial_count}")

    # Go to tools page
    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")
    save_screenshot(page, "bi_01_tools_page")

    # Find all cards using data-slot attribute
    cards = page.locator('[data-slot="card"]')
    card_count = cards.count()
    print(f"Found {card_count} cards")

    # Find the card containing our tool name
    bi_card = None
    for i in range(card_count):
        card = cards.nth(i)
        text_content = card.inner_text()
        if "BIテスト" in text_content:
            bi_card = card
            print(f"Found BI test card at index {i}")
            break

    if not bi_card:
        save_screenshot(page, "bi_02_not_found")
        pytest.fail("Could not find BI test tool card")

    save_screenshot(page, "bi_02_found")

    # Find the execute button within this card
    execute_btn = bi_card.locator('button[title="実行"]')
    btn_count = execute_btn.count()
    print(f"Execute buttons in BI card: {btn_count}")

    if btn_count == 0:
        all_buttons = bi_card.locator('button')
        print(f"All buttons in card: {all_buttons.count()}")
        for i in range(all_buttons.count()):
            btn = all_buttons.nth(i)
            print(f"Button {i}: title={btn.get_attribute('title')}, text={btn.inner_text()}")
        save_screenshot(page, "bi_03_no_button")
        pytest.fail("No execute button in BI card")

    # Click the button
    print("Clicking execute button...")
    execute_btn.first.click()

    # Wait for action
    page.wait_for_timeout(3000)
    save_screenshot(page, "bi_04_after_click")

    # Check if run was created
    new_count = get_runs_count(BI_TOOL_ID)
    print(f"New runs count: {new_count}")

    if new_count > initial_count:
        print("Run was created! Waiting for runner to process...")

        # Wait for runner to complete (up to 30 seconds)
        for _ in range(15):
            page.wait_for_timeout(2000)
            latest = get_latest_run(BI_TOOL_ID)
            print(f"Latest run status: {latest.get('status')}")
            if latest.get('status') in ('success', 'failed'):
                break

        latest = get_latest_run(BI_TOOL_ID)
        if latest.get('status') == 'success':
            print(f"SUCCESS! BI file opened: {latest.get('summary')}")
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
