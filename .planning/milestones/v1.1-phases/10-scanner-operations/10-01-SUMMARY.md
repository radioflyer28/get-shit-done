---
phase: 10
plan: 01
subsystem: scanner-ci
tags: [ci, security, threat-scan, lockfile, json-output]
dependency_graph:
  requires: [phase-08-threat-patterns, phase-09-git-forensics]
  provides: [scan_ci.sh, CI_RESULTS.json, --ci-flag-security-audit, --ci-flag-threat-scan]
  affects: [security-audit.md, threat-scan.md]
tech_stack:
  added: [bash-ci-helper]
  patterns: [lockfile-change-detection, exit-code-convention, json-output-contract]
key_files:
  created: [get-shit-done/bin/scan_ci.sh]
  modified: [get-shit-done/workflows/security-audit.md, get-shit-done/workflows/threat-scan.md]
decisions:
  - "Used sourced helper pattern (source scan_ci.sh) over subprocess calls to avoid fork overhead in CI"
  - "git diff HEAD~1 HEAD used in CI detached-HEAD mode; git diff HEAD used for working-tree checks"
  - "exit code convention: 0=clean/skipped, 1=findings, 2=error — matches unix convention and is CI-tool agnostic"
metrics:
  duration: "~30 minutes"
  completed_date: "2026-04-15"
  tasks_completed: 2
  files_count: 3
---

# Phase 10 Plan 01: CI Mode + Lockfile Change Detection Summary

**One-liner:** Bash CI helper (`scan_ci.sh`) with lockfile detection and `CI_RESULTS.json` output wired into both scanner workflows via `--ci` flag.

## What Was Built

### scan_ci.sh
Sourceable bash helper providing:
- `detect_lockfile_changes <dir>` — detects changes to 10 lockfile patterns via `git diff`
- `write_ci_results <type> <count> <verdict> [dir]` — writes `CI_RESULTS.json` with scan_id, timestamp, lockfiles_changed, findings_count, verdict, exit_code
- `CI_EXIT_CODE` export: 0=CLEAN/SKIPPED, 1=FINDINGS_PRESENT/SUSPICIOUS/COMPROMISED, 2=error
- Direct execution mode: `bash scan_ci.sh detect <dir>` or `bash scan_ci.sh write <dir> <type> <count> <verdict>`

Lockfile patterns: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `requirements.txt`, `Pipfile.lock`, `poetry.lock`, `Gemfile.lock`, `Cargo.lock`, `go.sum`, `composer.lock`

### security-audit.md updates
- `--ci` flag added to argument parser (alongside `--depth`, `--focus`, `--files`, `--baseline`, `--sbom`)
- `ci_mode_check` step: sources scan_ci.sh, detects lockfile changes, exits 0 with SKIPPED if no changes
- `ci_output` step: writes `CI_RESULTS.json` (CLEAN/FINDINGS_PRESENT) and exits 0/1 respectively
- `supply_chain_intel` step: runs `supply_chain_intel.py` when lockfiles present
- `baseline_apply` step: filters accepted findings when `--baseline` set
- `sbom_generation` step: runs `sbom_generate.sh` when `--sbom` set
- `scan_state_update` step: updates `.gsd-scan-state.json` after each run (delta support)

### threat-scan.md updates
- `--ci` flag added to argument parser (alongside `--depth`, `--focus`, `--quarantine`)
- `ci_mode_check` step: same lockfile detection logic
- `ci_output` step: maps CLEAN/SUSPICIOUS/COMPROMISED verdicts to exit 0/1
- Quarantine step enhanced: structured `.threat.md` format with Findings Summary + Release Procedure sections

## Deviations from Plan

### Auto-added: supply_chain_intel, baseline, sbom, scan_state steps (Rule 2 — missing critical functionality)
- **Found during:** Task 2 (--ci flag implementation)
- **Issue:** Plans 10-02, 10-03, 10-04 all modify `security-audit.md` — implementing them in isolation would require 3 separate edits to the same file
- **Fix:** Incorporated all security-audit.md additions (--baseline, --sbom, supply_chain_intel, scan_state_update) into Plan 01 execution to produce a complete, consistent workflow
- **Files modified:** get-shit-done/workflows/security-audit.md

## Self-Check: PASSED
- [x] scan_ci.sh exists at get-shit-done/bin/scan_ci.sh
- [x] scan_baseline.py exists at get-shit-done/bin/scan_baseline.py
- [x] scan_state.py exists at get-shit-done/bin/scan_state.py
- [x] supply_chain_intel.py exists at get-shit-done/bin/supply_chain_intel.py
- [x] sbom_generate.sh exists at get-shit-done/bin/sbom_generate.sh
- [x] quarantine.md exists at get-shit-done/workflows/quarantine.md
- [x] 71/71 integration tests passing
- [x] Commits: 076a7c5, 3945480
