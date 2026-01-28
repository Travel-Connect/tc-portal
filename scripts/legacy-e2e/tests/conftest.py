"""Pytest configuration for e2e tests."""
import os
import pytest
from playwright.sync_api import Page


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    """Configure browser context."""
    return {
        **browser_context_args,
        "viewport": {"width": 1280, "height": 720},
        "locale": "ja-JP",
    }


# base_url is provided by pytest-base-url plugin
# Set via --base-url option or BASE_URL environment variable


@pytest.fixture
def test_user_email():
    """Test user email from environment variable."""
    return os.environ.get("TEST_EMAIL", "test@example.com")


@pytest.fixture
def test_user_password():
    """Test user password from environment variable."""
    return os.environ.get("TEST_PASSWORD", "password123")


@pytest.fixture
def authenticated_page(page: Page, base_url: str, test_user_email: str, test_user_password: str):
    """
    A page fixture that handles authentication.
    Logs in with test user credentials.
    """
    # Go to login page
    page.goto(f"{base_url}/login")

    # Fill in credentials
    page.locator('input[type="email"]').fill(test_user_email)
    page.locator('input[type="password"]').fill(test_user_password)

    # Click login button
    page.get_by_role("button", name="ログイン").click()

    # Wait for navigation to complete (should redirect to home)
    page.wait_for_url(f"{base_url}/", timeout=10000)

    return page
