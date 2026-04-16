#!/usr/bin/env python3
# benign-subprocess.py — legitimate subprocess use, should NOT trigger
import subprocess

# Legitimate: runs a specific command, not a shell, no socket piping
result = subprocess.run(['git', 'status'], capture_output=True, text=True)
print(result.stdout)
