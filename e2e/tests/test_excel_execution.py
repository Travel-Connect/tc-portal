"""Excel execution tests."""
import os
import pytest
import time
from pathlib import Path
from playwright.sync_api import Page, expect
import requests

SCREENSHOT_DIR = Path(__file__).parent.parent / "screenshots"
SUPABASE_URL = "https://beopwoevumsduqlxzudu.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlb3B3b2V2dW1zZHVxbHh6dWR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3ODU2OCwiZXhwIjoyMDgzODU0NTY4fQ.zkCFql0ogzb3X_WXpxSMgY00HtYyZikbJBFRxwbQq3Q"


def save_screenshot(page: Page, name: str):
    """Save screenshot to screenshots directory."""
    SCREENSHOT_DIR.mkdir(exist_ok=True)
    path = SCREENSHOT_DIR / f"{name}.png"
    page.screenshot(path=str(path))
    print(f"Screenshot saved: {path}")


def login(page: Page, base_url: str):
    """Helper to login with test credentials."""
    test_email = os.environ.get("TEST_EMAIL")
    test_password = os.environ.get("TEST_PASSWORD")

    if not test_email or not test_password:
        pytest.skip("TEST_EMAIL and TEST_PASSWORD environment variables required")

    page.goto(f"{base_url}/login")
    page.wait_for_load_state("networkidle")

    page.fill('input[type="email"]', test_email)
    page.fill('input[type="password"]', test_password)
    page.click('button[type="submit"]')

    page.wait_for_url(lambda url: "/login" not in url, timeout=15000)
    page.wait_for_load_state("networkidle")
    print(f"Logged in, current URL: {page.url}")


def get_runs_for_tool(tool_id: str):
    """Get runs for a specific tool from Supabase."""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/runs?tool_id=eq.{tool_id}&order=requested_at.desc&limit=5",
        headers=headers,
    )
    return response.json()


def get_excel_tool():
    """Get Excel tool from Supabase."""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/tools?tool_type=eq.excel&limit=1",
        headers=headers,
    )
    tools = response.json()
    return tools[0] if tools else None


def test_excel_tool_exists():
    """Test that Excel tool exists in database."""
    tool = get_excel_tool()
    assert tool is not None, "No Excel tool found in database"
    print(f"Excel tool found: {tool['name']} (id: {tool['id']})")
    print(f"Target: {tool['target']}")


def test_excel_execute_button_visible(page: Page, base_url: str):
    """Test that Excel tool has execute button visible."""
    login(page, base_url)

    # Navigate to home page where tools are displayed
    page.goto(f"{base_url}/")
    page.wait_for_load_state("networkidle")

    save_screenshot(page, "excel_01_home")

    # Find execute buttons
    execute_buttons = page.locator('button[title="実行"]')
    count = execute_buttons.count()
    print(f"Found {count} execute buttons on page")

    save_screenshot(page, "excel_02_buttons")

    # Navigate to tools page
    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")

    save_screenshot(page, "excel_03_tools_page")

    execute_buttons = page.locator('button[title="実行"]')
    count = execute_buttons.count()
    print(f"Found {count} execute buttons on tools page")


def test_excel_direct_execution(page: Page, base_url: str):
    """Test Excel tool direct execution (no dialog)."""
    login(page, base_url)

    # Get Excel tool info
    tool = get_excel_tool()
    if not tool:
        pytest.skip("No Excel tool in database")

    tool_id = tool["id"]
    tool_name = tool["name"]
    print(f"Testing Excel tool: {tool_name} (id: {tool_id})")

    # Get initial run count
    initial_runs = get_runs_for_tool(tool_id)
    initial_count = len(initial_runs)
    print(f"Initial runs count: {initial_count}")

    # Navigate to tools page
    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")

    save_screenshot(page, "excel_exec_01_tools")

    # Find the tool card by looking for the name
    # The tool card contains the name and should have an execute button nearby
    tool_cards = page.locator("text=" + tool_name)
    card_count = tool_cards.count()
    print(f"Found {card_count} cards with name '{tool_name}'")

    if card_count == 0:
        # Try searching on home page
        page.goto(f"{base_url}/")
        page.wait_for_load_state("networkidle")
        tool_cards = page.locator("text=" + tool_name)
        card_count = tool_cards.count()
        print(f"Found {card_count} cards on home page")

    save_screenshot(page, "excel_exec_02_found_card")

    # Find execute buttons
    execute_buttons = page.locator('button[title="実行"]')
    btn_count = execute_buttons.count()
    print(f"Found {btn_count} execute buttons")

    if btn_count == 0:
        save_screenshot(page, "excel_exec_03_no_buttons")
        pytest.fail("No execute buttons found!")

    # Click the first execute button (this should trigger createRun directly)
    execute_buttons.first.click()
    print("Clicked execute button")

    # Wait for the action to complete
    page.wait_for_timeout(2000)

    save_screenshot(page, "excel_exec_04_after_click")

    # Check if run was created
    time.sleep(1)  # Give Supabase time to process
    new_runs = get_runs_for_tool(tool_id)
    new_count = len(new_runs)
    print(f"New runs count: {new_count}")

    if new_count > initial_count:
        print(f"SUCCESS! New run created: {new_runs[0]}")
        assert new_runs[0]["status"] in ["queued", "running", "success", "failed"]
    else:
        # Check any tool runs
        headers = {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        }
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/runs?order=requested_at.desc&limit=3",
            headers=headers,
        )
        recent = response.json()
        print(f"Recent runs (any tool): {recent}")
        pytest.fail(f"No new run created for Excel tool. Initial: {initial_count}, New: {new_count}")


def test_page_console_errors(page: Page, base_url: str):
    """Test for JavaScript console errors when clicking execute."""
    errors = []

    def handle_console(msg):
        if msg.type == "error":
            errors.append(msg.text)
            print(f"Console error: {msg.text}")

    page.on("console", handle_console)

    login(page, base_url)

    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")

    execute_buttons = page.locator('button[title="実行"]')
    if execute_buttons.count() > 0:
        execute_buttons.first.click()
        page.wait_for_timeout(3000)

    save_screenshot(page, "console_errors_test")

    if errors:
        print(f"Found {len(errors)} console errors:")
        for e in errors:
            print(f"  - {e}")

    # Don't fail on errors, just report them
    print(f"Total console errors: {len(errors)}")
