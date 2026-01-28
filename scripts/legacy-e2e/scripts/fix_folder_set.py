"""Fix folder_set tools to have execution_mode='helper'."""
import os
from pathlib import Path
import requests

# Load .env.local
_env_file = Path(__file__).resolve().parent.parent.parent.parent / ".env.local"
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
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


def fix_folder_set_execution_mode():
    """Update all folder_set tools to have execution_mode='helper'."""
    # Get all folder_set tools with execution_mode != 'helper'
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/tools?tool_type=eq.folder_set&execution_mode=neq.helper&select=id,name,execution_mode",
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        },
    )
    tools = response.json()

    print(f"Found {len(tools)} folder_set tools to fix:\n")

    for tool in tools:
        print(f"Fixing: {tool['name']} (ID: {tool['id']})")
        print(f"  Current execution_mode: {tool['execution_mode']}")

        # Update to helper
        update_response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/tools?id=eq.{tool['id']}",
            headers=headers,
            json={"execution_mode": "helper"},
        )

        if update_response.status_code in (200, 204):
            print(f"  Updated to: helper")
        else:
            print(f"  ERROR: {update_response.status_code} - {update_response.text}")
        print()

    print("Done!")


if __name__ == "__main__":
    fix_folder_set_execution_mode()
