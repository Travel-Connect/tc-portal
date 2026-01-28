"""Tool ordering tests."""
import os
from playwright.sync_api import Page, expect


def test_tool_ordering_save_on_home(page: Page, base_url: str):
    """Test tool ordering save functionality on home page."""
    # Get test credentials from environment
    test_email = os.environ.get("TEST_EMAIL")
    test_password = os.environ.get("TEST_PASSWORD")

    if not test_email or not test_password:
        print("TEST_EMAIL and TEST_PASSWORD environment variables required")
        return

    # Login first
    page.goto(f"{base_url}/login")
    page.fill('input[type="email"]', test_email)
    page.fill('input[type="password"]', test_password)
    page.click('button[type="submit"]')

    # Wait for redirect to home
    page.wait_for_url(f"{base_url}/", timeout=10000)

    # Capture console errors
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

    # Click the edit button (並替)
    edit_button = page.locator("button:has-text('並替'), button:has-text('編集')").first
    edit_button.click()

    # Wait for edit mode
    page.wait_for_timeout(500)

    # Click complete button (完了)
    complete_button = page.locator("button:has-text('完了'), button:has-text('編集完了')").first
    complete_button.click()

    # Wait for save response
    page.wait_for_timeout(2000)

    # Check for save status
    save_success = page.locator("text=保存完了").is_visible()
    save_error = page.locator("text=保存失敗").is_visible()

    # Print console errors for debugging
    if console_errors:
        print("Console errors:")
        for error in console_errors:
            print(f"  - {error}")

    if save_error:
        print("SAVE FAILED - Check server logs for details")
        # Don't fail the test yet, we want to see the error

    assert save_success or not save_error, "Save should succeed or at least not show error"


def test_tool_ordering_save_on_tools_page(page: Page, base_url: str):
    """Test tool ordering save functionality on tools page."""
    # Get test credentials from environment
    test_email = os.environ.get("TEST_EMAIL")
    test_password = os.environ.get("TEST_PASSWORD")

    if not test_email or not test_password:
        print("TEST_EMAIL and TEST_PASSWORD environment variables required")
        return

    # Login first
    page.goto(f"{base_url}/login")
    page.fill('input[type="email"]', test_email)
    page.fill('input[type="password"]', test_password)
    page.click('button[type="submit"]')

    # Wait for redirect to home
    page.wait_for_url(f"{base_url}/", timeout=10000)

    # Navigate to tools page
    page.goto(f"{base_url}/tools")
    page.wait_for_load_state("networkidle")

    # Capture console errors
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

    # Click the edit button
    edit_button = page.locator("button:has-text('編集')").first
    edit_button.click()

    # Wait for edit mode
    page.wait_for_timeout(500)

    # Click complete button (編集完了)
    complete_button = page.locator("button:has-text('編集完了')").first
    complete_button.click()

    # Wait for save response
    page.wait_for_timeout(2000)

    # Check for save status
    save_success = page.locator("text=保存完了").is_visible()
    save_error = page.locator("text=保存失敗").is_visible()

    # Print console errors for debugging
    if console_errors:
        print("Console errors:")
        for error in console_errors:
            print(f"  - {error}")

    if save_error:
        print("SAVE FAILED - Check server logs for details")

    assert save_success or not save_error, "Save should succeed or at least not show error"
