#!/usr/bin/env python3
# benign-env-access.py — legitimate env var access, should NOT trigger
import os

# Legitimate: access specific keys, not enumerate everything
api_key = os.environ.get('API_KEY', '')
db_host = os.environ.get('DATABASE_HOST', 'localhost')
debug = os.environ.get('DEBUG', 'false').lower() == 'true'

print(f"Connecting to {db_host}")
