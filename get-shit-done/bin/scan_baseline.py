#!/usr/bin/env python3
"""
scan_baseline.py — Baseline suppression for GSD security scanner

Usage:
  python3 scan_baseline.py apply <results.json> <baseline.json>   # filter findings, print to stdout
  python3 scan_baseline.py add   <results.json> <baseline.json> --hash H --file F --rule-id R --by USER [--note N]
  python3 scan_baseline.py list  <baseline.json>

Baseline file: .gsd-baseline.json (detect-secrets compatible format)
"""

import argparse
import datetime
import hashlib
import json
import os
import sys


def compute_finding_hash(finding):
    """sha256(rule_id:file:line) — deterministic, stable across scans."""
    rule_id = finding.get("rule_id", "")
    file_ = finding.get("file", "")
    line = str(finding.get("line", 0))
    raw = f"{rule_id}:{file_}:{line}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def load_baseline(baseline_path):
    """Load baseline file; return empty baseline structure if missing."""
    if not os.path.exists(baseline_path):
        return {"version": "1", "entries": []}
    with open(baseline_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "entries" not in data:
        data["entries"] = []
    return data


def load_results(results_path):
    """Load PRE-SCAN-RESULTS.json; return empty findings structure if missing."""
    if not os.path.exists(results_path):
        return {"findings": []}
    with open(results_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "findings" not in data:
        data["findings"] = []
    return data


def cmd_apply(args):
    """Filter findings against baseline; print filtered results to stdout."""
    results = load_results(args.results)
    baseline = load_baseline(args.baseline)

    accepted_hashes = {entry["hash"] for entry in baseline["entries"]}

    original_count = len(results["findings"])
    kept = []
    suppressed = 0

    for finding in results["findings"]:
        h = compute_finding_hash(finding)
        if h in accepted_hashes:
            suppressed += 1
        else:
            kept.append(finding)

    filtered = dict(results)
    filtered["findings"] = kept
    filtered["baseline_applied"] = True
    filtered["suppressed_count"] = suppressed

    print(json.dumps(filtered, indent=2))
    print(
        f"Baseline: suppressed {suppressed} findings, {len(kept)} remaining",
        file=sys.stderr,
    )


def cmd_add(args):
    """Add a new entry to the baseline file (idempotent by hash)."""
    baseline = load_baseline(args.baseline)

    existing_hashes = {e["hash"] for e in baseline["entries"]}
    if args.hash in existing_hashes:
        print(
            f"Baseline: entry {args.hash[:8]}… already present (idempotent, no change)",
            file=sys.stderr,
        )
        return

    entry = {
        "hash": args.hash,
        "file": args.file,
        "rule_id": args.rule_id,
        "accepted_by": args.by,
        "accepted_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "note": args.note or "",
    }
    baseline["entries"].append(entry)

    with open(args.baseline, "w", encoding="utf-8") as f:
        json.dump(baseline, f, indent=2)
        f.write("\n")

    print(f"Baseline: added entry {args.hash[:8]}… for {args.file}", file=sys.stderr)


def cmd_list(args):
    """Print tabular list of accepted baseline entries."""
    baseline = load_baseline(args.baseline)

    if not baseline["entries"]:
        print("No baseline entries.")
        return

    header = f"{'HASH':10}  {'FILE':40}  {'RULE':50}  {'BY':15}  NOTE"
    print(header)
    print("-" * len(header))
    for entry in baseline["entries"]:
        h = entry.get("hash", "")[:8]
        file_ = entry.get("file", "")[:40]
        rule = entry.get("rule_id", "")[:50]
        by = entry.get("accepted_by", "")[:15]
        note = entry.get("note", "")
        print(f"{h:10}  {file_:40}  {rule:50}  {by:15}  {note}")


def main():
    parser = argparse.ArgumentParser(
        description="GSD security baseline management (apply/add/list)"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # apply
    p_apply = sub.add_parser("apply", help="Filter findings against baseline")
    p_apply.add_argument("results", help="PRE-SCAN-RESULTS.json path")
    p_apply.add_argument("baseline", help=".gsd-baseline.json path")

    # add
    p_add = sub.add_parser("add", help="Add a finding to baseline")
    p_add.add_argument("results", help="PRE-SCAN-RESULTS.json path (for context)")
    p_add.add_argument("baseline", help=".gsd-baseline.json path")
    p_add.add_argument("--hash", required=True, help="Finding hash (sha256)")
    p_add.add_argument("--file", required=True, help="Source file path")
    p_add.add_argument("--rule-id", required=True, dest="rule_id", help="Rule ID")
    p_add.add_argument("--by", required=True, help="Accepted by (username)")
    p_add.add_argument("--note", default="", help="Optional note")

    # list
    p_list = sub.add_parser("list", help="List baseline entries")
    p_list.add_argument("baseline", help=".gsd-baseline.json path")

    args = parser.parse_args()

    if args.command == "apply":
        cmd_apply(args)
    elif args.command == "add":
        cmd_add(args)
    elif args.command == "list":
        cmd_list(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
