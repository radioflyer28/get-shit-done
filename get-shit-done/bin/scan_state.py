#!/usr/bin/env python3
"""
scan_state.py — Scan state tracking and delta reporting for GSD security scanner

Usage:
  python3 scan_state.py record <results.json> <state.json>   # write state file
  python3 scan_state.py delta  <results.json> <state.json>   # print delta JSON

State file: .gsd-scan-state.json
"""

import argparse
import datetime
import hashlib
import json
import os
import sys


def compute_finding_hash(finding):
    """sha256(rule_id:file:line) — same algorithm as scan_baseline.py."""
    rule_id = finding.get("rule_id", "")
    file_ = finding.get("file", "")
    line = str(finding.get("line", 0))
    raw = f"{rule_id}:{file_}:{line}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def make_scan_id():
    """Generate a scan ID: short git hash + epoch."""
    import subprocess
    try:
        git_short = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL,
            timeout=5,
        ).decode().strip()
    except Exception:
        git_short = "no-git"
    import time
    epoch = int(time.time())
    return f"{git_short}-{epoch}"


def load_results(results_path):
    """Load PRE-SCAN-RESULTS.json; return empty findings structure if missing."""
    if not os.path.exists(results_path):
        return {"findings": []}
    with open(results_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "findings" not in data:
        data["findings"] = []
    return data


def load_state(state_path):
    """Load state file; return empty state structure if missing."""
    if not os.path.exists(state_path):
        return {"version": "1", "last_scan": None}
    with open(state_path, "r", encoding="utf-8") as f:
        return json.load(f)


def cmd_record(args):
    """Record current scan results into state file."""
    results = load_results(args.results)

    findings_hashes = [compute_finding_hash(f) for f in results.get("findings", [])]
    findings_count = len(findings_hashes)
    scan_id = make_scan_id()
    ts = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    state = {
        "version": "1",
        "last_scan": {
            "scan_id": scan_id,
            "timestamp": ts,
            "findings_hashes": findings_hashes,
            "findings_count": findings_count,
        },
    }

    with open(args.state, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)
        f.write("\n")

    print(
        f"State recorded: {findings_count} findings, scan_id={scan_id}",
        file=sys.stderr,
    )


def cmd_delta(args):
    """Compute delta between current scan and last recorded state."""
    results = load_results(args.results)
    state = load_state(args.state)

    current_hashes = set(compute_finding_hash(f) for f in results.get("findings", []))

    last_scan = state.get("last_scan")
    if last_scan is None:
        # First scan — all current findings are NEW
        delta = {
            "new": list(current_hashes),
            "resolved": [],
            "accepted": [],
            "summary": {
                "new_count": len(current_hashes),
                "resolved_count": 0,
                "accepted_count": 0,
            },
        }
    else:
        previous_hashes = set(last_scan.get("findings_hashes", []))
        new_hashes = current_hashes - previous_hashes
        resolved_hashes = previous_hashes - current_hashes
        accepted_hashes = current_hashes & previous_hashes

        delta = {
            "new": list(new_hashes),
            "resolved": list(resolved_hashes),
            "accepted": list(accepted_hashes),
            "summary": {
                "new_count": len(new_hashes),
                "resolved_count": len(resolved_hashes),
                "accepted_count": len(accepted_hashes),
            },
        }

    print(json.dumps(delta, indent=2))


def main():
    parser = argparse.ArgumentParser(
        description="GSD scan state tracking and delta reporting"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # record
    p_record = sub.add_parser("record", help="Record current scan state")
    p_record.add_argument("results", help="PRE-SCAN-RESULTS.json (or filtered) path")
    p_record.add_argument("state", help=".gsd-scan-state.json path to write")

    # delta
    p_delta = sub.add_parser("delta", help="Compute delta vs last state")
    p_delta.add_argument("results", help="Current PRE-SCAN-RESULTS.json path")
    p_delta.add_argument("state", help=".gsd-scan-state.json path to read")

    args = parser.parse_args()

    if args.command == "record":
        cmd_record(args)
    elif args.command == "delta":
        cmd_delta(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
