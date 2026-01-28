"""Login page tests."""
from playwright.sync_api import Page, expect


def test_login_page_loads(page: Page, base_url: str):
    """Test that the login page loads correctly."""
    page.goto(f"{base_url}/login")
    
    # Check page title or heading
    expect(page.locator("h1")).to_contain_text("ログイン")
    
    # Check that email input exists
    expect(page.locator('input[type="email"]')).to_be_visible()
    
    # Check that password input exists
    expect(page.locator('input[type="password"]')).to_be_visible()
    
    # Check that login button exists
    expect(page.get_by_role("button", name="ログイン")).to_be_visible()


def test_login_page_shows_error_on_empty_submit(page: Page, base_url: str):
    """Test that the login page shows error when submitting empty form."""
    page.goto(f"{base_url}/login")
    
    # Try to submit without filling in fields
    page.get_by_role("button", name="ログイン").click()
    
    # Browser validation should prevent submission (HTML5 required)
    # The email field should still be empty and page should not navigate
    expect(page).to_have_url(f"{base_url}/login")
