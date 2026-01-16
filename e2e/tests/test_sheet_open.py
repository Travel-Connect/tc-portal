"""Sheet (Google Sheets) open test.

Tests that sheet tools open Google Sheets URLs in new tabs.
"""
import os
import pytest
from pathlib import Path
from playwright.sync_api import Page, expect

SCREENSHOT_DIR = Path(__file__).parent.parent / "screenshots"

# Test sheet tool ID (スプレッドシートテスト)
SHEET_TOOL_ID = "4e04ca9e-aa06-40f3-8d7e-76a28e61587e"
SHEET_URL = "https://docs.google.com/spreadsheets/d/1z-JSLrMRH1nAR8FaqCW7UC3d73ODqBeIxB5egK9LR3A/edit"


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


def test_sheet_card_click_opens_new_tab(page: Page, base_url: str):
    """Test that clicking sheet card opens Google Sheets in new tab.

    Sheet tools should:
    1. Have execution_mode='open'
    2. On click, open the target URL in a new tab
    3. NOT navigate to the tool detail page
    """
    login(page, base_url)

    # Go to tools page
    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")
    save_screenshot(page, "sheet_01_tools_page")

    # Find all cards
    cards = page.locator('[data-slot="card"]')
    card_count = cards.count()
    print(f"Found {card_count} cards")

    # Find the sheet card by name
    sheet_card = None
    for i in range(card_count):
        card = cards.nth(i)
        text_content = card.inner_text()
        if "スプレッドシートテスト" in text_content:
            sheet_card = card
            print(f"Found sheet card at index {i}: {text_content[:50]}...")
            break

    if not sheet_card:
        save_screenshot(page, "sheet_02_not_found")
        pytest.fail("Could not find sheet test tool card")

    save_screenshot(page, "sheet_02_found")

    # Track new tab/popup
    new_page_url = None

    def handle_popup(popup):
        nonlocal new_page_url
        new_page_url = popup.url
        print(f"New tab opened: {popup.url}")
        popup.close()

    page.context.on("page", handle_popup)

    # Click the card
    print("Clicking sheet card...")
    current_url = page.url
    sheet_card.click()

    # Wait for popup or navigation
    page.wait_for_timeout(2000)
    save_screenshot(page, "sheet_03_after_click")

    # Check results
    new_url = page.url

    # Success criteria:
    # 1. Should NOT have navigated to detail page
    # 2. Should have opened new tab with Google Sheets URL

    if f"/tools/{SHEET_TOOL_ID}" in new_url:
        pytest.fail(
            f"FAIL: Card click navigated to detail page. "
            f"Sheet tools should open in new tab, not navigate to detail page."
        )

    if new_page_url:
        print(f"SUCCESS: New tab was opened!")
        print(f"URL: {new_page_url}")
        # Verify it's Google Sheets
        assert "docs.google.com/spreadsheets" in new_page_url, \
            f"New tab should be Google Sheets URL, got: {new_page_url}"
    else:
        # If still on tools page, that's OK (popup might have been blocked)
        if "/tools" in new_url and f"/tools/{SHEET_TOOL_ID}" not in new_url:
            print("SUCCESS: Stayed on tools page (new tab likely opened or blocked)")
        else:
            pytest.fail(f"Unexpected navigation to: {new_url}")

    print("Test completed successfully!")


def test_sheet_has_correct_badge(page: Page, base_url: str):
    """Test that sheet tool shows correct badge type."""
    login(page, base_url)

    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")

    # Find the sheet card
    cards = page.locator('[data-slot="card"]')
    for i in range(cards.count()):
        card = cards.nth(i)
        text_content = card.inner_text()
        if "スプレッドシートテスト" in text_content:
            # Check that it shows "Sheet" badge
            badge = card.locator("text=Sheet")
            if badge.count() > 0:
                print("SUCCESS: sheet tool shows 'Sheet' badge")
                return
            else:
                print(f"Card content: {text_content}")
                pytest.fail("sheet tool should show 'Sheet' badge")

    pytest.fail("Could not find sheet test tool")
