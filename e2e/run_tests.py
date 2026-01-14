#!/usr/bin/env python
"""Helper script to run e2e tests."""
import subprocess
import sys


def main():
    """Run pytest with playwright."""
    args = sys.argv[1:] if len(sys.argv) > 1 else []
    
    cmd = ["uv", "run", "pytest"] + args
    
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
