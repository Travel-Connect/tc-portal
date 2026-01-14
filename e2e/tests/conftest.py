"""Pytest configuration for e2e tests."""
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


@pytest.fixture
def authenticated_page(page: Page, base_url: str):
    """
    A page fixture that handles authentication.
    For now, this just returns the page.
    In production, you would add login logic here.
    """
    return page
