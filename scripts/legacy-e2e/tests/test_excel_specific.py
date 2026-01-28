"""Specific Excel tool execution test."""
import os
import pytest
import time
from pathlib import Path
from playwright.sync_api import Page, expect
import requests

SCREENSHOT_DIR = Path(__file__).parent.parent / "screenshots"
SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


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


def test_click_excel_specific_button(page: Page, base_url: str):
    """Test clicking specifically on the Excel tool's execute button."""
    login(page, base_url)

    # Excel tool ID
    excel_tool_id = "22222222-2222-2222-2222-222222222202"
    initial_count = get_runs_count(excel_tool_id)
    print(f"Initial runs count for Excel tool: {initial_count}")

    # Go to tools page
    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")
    save_screenshot(page, "excel_specific_01")

    # Find the card that contains "料金計算シート"
    # The card structure is: Card > CardHeader > div > div > CardTitle (tool name)
    # We need to find the card and then find the button within it

    # First, let's find all cards using data-slot attribute
    cards = page.locator('[data-slot="card"]')
    card_count = cards.count()
    print(f"Found {card_count} cards")

    # Find the card containing our tool name
    excel_card = None
    for i in range(card_count):
        card = cards.nth(i)
        text_content = card.inner_text()
        if "料金計算シート" in text_content:
            excel_card = card
            print(f"Found Excel card at index {i}")
            break

    if not excel_card:
        save_screenshot(page, "excel_specific_02_not_found")
        pytest.fail("Could not find Excel tool card")

    save_screenshot(page, "excel_specific_02_found")

    # Find the execute button within this card
    execute_btn = excel_card.locator('button[title="実行"]')
    btn_count = execute_btn.count()
    print(f"Execute buttons in Excel card: {btn_count}")

    if btn_count == 0:
        # Try finding any button with Play icon
        all_buttons = excel_card.locator('button')
        print(f"All buttons in card: {all_buttons.count()}")
        for i in range(all_buttons.count()):
            btn = all_buttons.nth(i)
            print(f"Button {i}: title={btn.get_attribute('title')}, text={btn.inner_text()}")
        save_screenshot(page, "excel_specific_03_no_button")
        pytest.fail("No execute button in Excel card")

    # Click the button
    print("Clicking execute button...")
    execute_btn.first.click()

    # Wait for action
    page.wait_for_timeout(3000)
    save_screenshot(page, "excel_specific_04_after_click")

    # Check if run was created
    new_count = get_runs_count(excel_tool_id)
    print(f"New runs count: {new_count}")

    if new_count > initial_count:
        print("SUCCESS! Run was created for Excel tool!")
    else:
        # Get latest runs
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


def test_network_requests(page: Page, base_url: str):
    """Monitor network requests when clicking execute button."""
    login(page, base_url)

    requests_log = []

    def log_request(request):
        if "supabase" in request.url or "runs" in request.url:
            requests_log.append({
                "url": request.url,
                "method": request.method,
                "post_data": request.post_data if request.method == "POST" else None
            })

    def log_response(response):
        if "supabase" in response.url or "runs" in response.url:
            print(f"Response: {response.status} {response.url}")

    page.on("request", log_request)
    page.on("response", log_response)

    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")

    # Find and click Excel tool button
    excel_card = page.locator('text=料金計算シート').first
    if excel_card:
        # Get parent card
        card = excel_card.locator('xpath=ancestor::a | ancestor::div[contains(@class, "rounded")]').first
        execute_btn = card.locator('button[title="実行"]')
        if execute_btn.count() > 0:
            print("Clicking execute button...")
            execute_btn.click()
            page.wait_for_timeout(3000)

    print(f"\nCaptured {len(requests_log)} relevant requests:")
    for req in requests_log:
        print(f"  {req['method']} {req['url']}")
        if req['post_data']:
            print(f"    Data: {req['post_data'][:200]}")
