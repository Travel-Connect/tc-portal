"""Check sheet tools configuration in the database."""
import os
from pathlib import Path
import requests

# Load .env.local
_env_file = Path(__file__).resolve().parent.parent.parent / ".env.local"
if _env_file.exists():
    with open(_env_file, "r", encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                os.environ.setdefault(_k, _v)

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
}


def get_sheet_tools():
    """Get all sheet tools."""
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/tools?tool_type=eq.sheet&select=id,name,tool_type,execution_mode,target",
        headers=headers,
    )
    return response.json()


def main():
    tools = get_sheet_tools()
    print(f"Found {len(tools)} sheet tools:\n")

    for tool in tools:
        print(f"ID: {tool['id']}")
        print(f"Name: {tool['name']}")
        print(f"tool_type: {tool['tool_type']}")
        print(f"execution_mode: {tool['execution_mode']}")
        print(f"target: {tool['target']}")
        print("-" * 50)

        # Check issues - sheet tools should open URLs in browser
        # So execution_mode should be 'open' and target should be a URL
        issues = []
        if tool['target'] and tool['target'].startswith('http'):
            # It's a URL, should be 'open' mode
            if tool['execution_mode'] != 'open':
                issues.append(f"URL-based sheet should have execution_mode='open', got '{tool['execution_mode']}'")
        else:
            # It's a local file path, needs helper
            if tool['execution_mode'] != 'helper':
                issues.append(f"Local file sheet should have execution_mode='helper', got '{tool['execution_mode']}'")

        if issues:
            print("ISSUES:")
            for issue in issues:
                print(f"  - {issue}")
        else:
            print("OK: Configuration looks correct")
        print()


if __name__ == "__main__":
    main()
