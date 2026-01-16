"""Fix folder_set tools to have execution_mode='helper'."""
import requests

SUPABASE_URL = "https://beopwoevumsduqlxzudu.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlb3B3b2V2dW1zZHVxbHh6dWR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3ODU2OCwiZXhwIjoyMDgzODU0NTY4fQ.zkCFql0ogzb3X_WXpxSMgY00HtYyZikbJBFRxwbQq3Q"

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
