#!/usr/bin/env python3
# malicious-reverse-shell.py — triggers thr-backdoor-reverse-shell-py
import subprocess

# Classic reverse shell — triggers rule
subprocess.Popen(['/bin/sh', '-i'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
