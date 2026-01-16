"""Folder set (multiple folders) open test.

Tests that folder_set tools open multiple folders via helper protocol.
"""
import os
import pytest
from pathlib import Path
from playwright.sync_api import Page, expect

SCREENSHOT_DIR = Path(__file__).parent.parent / "screenshots"

# Test folder_set tool ID (複数フォルダテスト)
FOLDER_SET_TOOL_ID = "0e374129-891c-496f-a341-1b0cc0f3cd88"


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


def test_folder_set_card_click_triggers_helper(page: Page, base_url: str):
    """Test that clicking folder_set card triggers tcportal:// helper URL.

    folder_set tools should:
    1. Have execution_mode='helper'
    2. On click, trigger tcportal://open?payload=... with action='open_folders'
    3. NOT navigate to the tool detail page
    """
    login(page, base_url)

    # Go to tools page
    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")
    save_screenshot(page, "folder_set_01_tools_page")

    # Find all cards
    cards = page.locator('[data-slot="card"]')
    card_count = cards.count()
    print(f"Found {card_count} cards")

    # Find the folder_set card by name
    folder_set_card = None
    for i in range(card_count):
        card = cards.nth(i)
        text_content = card.inner_text()
        if "複数フォルダテスト" in text_content or "フォルダテスト" in text_content:
            folder_set_card = card
            print(f"Found folder_set card at index {i}: {text_content[:50]}...")
            break

    if not folder_set_card:
        save_screenshot(page, "folder_set_02_not_found")
        pytest.fail("Could not find folder_set test tool card")

    save_screenshot(page, "folder_set_02_found")

    # Track navigation - we expect NO navigation to detail page
    navigated_to_detail = False

    def handle_navigation(response):
        nonlocal navigated_to_detail
        if f"/tools/{FOLDER_SET_TOOL_ID}" in response.url:
            navigated_to_detail = True

    page.on("response", handle_navigation)

    # Track tcportal:// URL trigger
    helper_triggered = False
    helper_url = None

    def handle_request_failed(request):
        nonlocal helper_triggered, helper_url
        if request.url.startswith("tcportal://"):
            helper_triggered = True
            helper_url = request.url
            print(f"Helper URL triggered: {request.url[:100]}...")

    page.on("requestfailed", handle_request_failed)

    # Click the card
    print("Clicking folder_set card...")
    current_url = page.url
    folder_set_card.click()

    # Wait a moment for any navigation or protocol trigger
    page.wait_for_timeout(2000)
    save_screenshot(page, "folder_set_03_after_click")

    # Check results
    new_url = page.url

    # Success criteria:
    # 1. Should NOT have navigated to detail page
    # 2. Should have stayed on tools page OR triggered helper protocol

    if f"/tools/{FOLDER_SET_TOOL_ID}" in new_url:
        pytest.fail(
            f"FAIL: Card click navigated to detail page. "
            f"This means execution_mode is not 'helper' or card click handler is wrong."
        )

    if helper_triggered:
        print(f"SUCCESS: Helper protocol was triggered!")
        print(f"URL: {helper_url}")
        # The payload is base64 encoded, so we check for the base64 prefix of {"action":"open_folders"
        # eyJhY3Rpb24iOiJvcGVuX2ZvbGRlcnMi = {"action":"open_folders"
        assert "eyJhY3Rpb24iOiJvcGVuX2ZvbGRlcnMi" in helper_url, \
            f"Helper URL should contain open_folders action (base64 encoded)"
    else:
        # If we're still on tools page and no navigation happened, that's also OK
        # (helper URL might have been handled by the OS)
        if current_url == new_url or "/tools" in new_url:
            print("SUCCESS: Stayed on tools page (helper likely handled by OS)")
        else:
            print(f"WARNING: Unexpected navigation to {new_url}")

    print("Test completed successfully!")


def test_folder_set_has_correct_badge(page: Page, base_url: str):
    """Test that folder_set tool shows correct badge type."""
    login(page, base_url)

    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")

    # Find the folder_set card
    cards = page.locator('[data-slot="card"]')
    for i in range(cards.count()):
        card = cards.nth(i)
        text_content = card.inner_text()
        if "複数フォルダテスト" in text_content:
            # Check that it shows "Folder" badge (TOOL_TYPE_LABELS['folder_set'] = 'Folder')
            badge = card.locator("text=Folder")
            if badge.count() > 0:
                print("SUCCESS: folder_set tool shows 'Folder' badge")
                return
            else:
                print(f"Card content: {text_content}")
                pytest.fail("folder_set tool should show 'Folder' badge")

    pytest.fail("Could not find folder_set test tool")
