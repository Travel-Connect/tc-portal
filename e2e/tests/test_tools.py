"""Tools page tests (requires authentication)."""
from playwright.sync_api import Page, expect


def test_tools_page_redirects_unauthenticated(page: Page, base_url: str):
    """Test that tools page redirects to login when not authenticated."""
    page.goto(f"{base_url}/tools")
    
    # Should redirect to login page
    expect(page).to_have_url(f"{base_url}/login", timeout=5000)


def test_home_page_redirects_unauthenticated(page: Page, base_url: str):
    """Test that home page redirects to login when not authenticated."""
    page.goto(f"{base_url}/")
    
    # Should redirect to login page
    expect(page).to_have_url(f"{base_url}/login", timeout=5000)
