"""Check and update helper-type tools execution_mode."""
import requests

SUPABASE_URL = "https://beopwoevumsduqlxzudu.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlb3B3b2V2dW1zZHVxbHh6dWR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3ODU2OCwiZXhwIjoyMDgzODU0NTY4fQ.zkCFql0ogzb3X_WXpxSMgY00HtYyZikbJBFRxwbQq3Q"

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
