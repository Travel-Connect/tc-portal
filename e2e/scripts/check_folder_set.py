"""Check folder_set tools configuration in the database."""
import requests

SUPABASE_URL = "https://beopwoevumsduqlxzudu.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlb3B3b2V2dW1zZHVxbHh6dWR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3ODU2OCwiZXhwIjoyMDgzODU0NTY4fQ.zkCFql0ogzb3X_WXpxSMgY00HtYyZikbJBFRxwbQq3Q"

headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
}


def get_folder_set_tools():
    """Get all folder_set tools."""
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/tools?tool_type=eq.folder_set&select=id,name,tool_type,execution_mode,run_config,target",
        headers=headers,
    )
    return response.json()


def main():
    tools = get_folder_set_tools()
    print(f"Found {len(tools)} folder_set tools:\n")

    for tool in tools:
        print(f"ID: {tool['id']}")
        print(f"Name: {tool['name']}")
        print(f"tool_type: {tool['tool_type']}")
        print(f"execution_mode: {tool['execution_mode']}")
        print(f"run_config: {tool['run_config']}")
        print(f"target: {tool['target']}")
        print("-" * 50)

        # Check issues
        issues = []
        if tool['execution_mode'] != 'helper':
            issues.append(f"execution_mode should be 'helper', got '{tool['execution_mode']}'")
        if not tool['run_config'] or not tool['run_config'].get('paths'):
            issues.append("run_config.paths is missing or empty")

        if issues:
            print("ISSUES:")
            for issue in issues:
                print(f"  - {issue}")
        else:
            print("OK: Configuration looks correct")
        print()


if __name__ == "__main__":
    main()
