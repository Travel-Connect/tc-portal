"""Check and update helper-type tools execution_mode."""
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

# Helper tool types that should have execution_mode='helper'
HELPER_TYPES = ["folder", "folder_set", "shortcut", "excel", "bi", "exe", "bat"]

print("=== Current Helper Tool Status ===")
tools_to_update = []

for tool_type in HELPER_TYPES:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/tools?tool_type=eq.{tool_type}&select=id,name,tool_type,execution_mode",
        headers=headers,
    )
    tools = r.json()
    if tools:
        print(f"\n{tool_type} tools:")
        for tool in tools:
            name = tool.get("name", "?")
            mode = tool.get("execution_mode", "?")
            tool_id = tool.get("id")
            status = "OK" if mode == "helper" else "(needs update)"
            print(f"  {name}: {mode} {status}")
            if mode != "helper":
                tools_to_update.append(tool_id)

if tools_to_update:
    print(f"\n=== Updating {len(tools_to_update)} tools to execution_mode='helper' ===")
    update_headers = {
        **headers,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    for tool_id in tools_to_update:
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/tools?id=eq.{tool_id}",
            headers=update_headers,
            json={"execution_mode": "helper"},
        )
        if r.status_code == 204:
            print(f"  Updated: {tool_id}")
        else:
            print(f"  Failed: {tool_id} - {r.status_code}")
    print("\nDone!")
else:
    print("\nAll helper tools already have execution_mode='helper'")
