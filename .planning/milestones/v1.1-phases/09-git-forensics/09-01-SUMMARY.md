---
phase: 09-git-forensics
plan: "01"
subsystem: security-tooling
tags: [git-forensics, supply-chain, threat-scan, binary-blob, history-rewrite, author-anomaly]
dependency_graph:
  requires: [08-threat-pattern-library]
  provides: [GIT-FORENSICS.md, git_forensics.sh, git_forensics_report.py, git-forensics.md workflow]
  affects: [threat-scan.md]
tech_stack:
  added: [bash, python3, git-cat-file, git-reflog]
  patterns: [severity-tiers, xml-isolation-tags, trap-EXIT-cleanup, prompt-injection-defense]
key_files:
  created:
    - get-shit-done/bin/git_forensics.sh
    - get-shit-done/bin/git_forensics_report.py
    - get-shit-done/workflows/git-forensics.md
    - tests/git-forensics.test.cjs
  modified:
    - get-shit-done/workflows/threat-scan.md
decisions:
  - XML-like tags isolate commit subjects/author names in report to prevent prompt injection
  - Four discrete detection functions (not classes) for testability and composability
  - trap EXIT guarantees tmp cleanup even on script error
  - git_forensics step inserted between prescan_threat and initialize in threat-scan.md
  - Binary detection: pipe git cat-file blob to file command (avoids executing content)
  - Timezone anomaly uses median (not mean) to avoid influence from a single outlier commit
metrics:
  duration: "~45 minutes"
  completed_date: "2026-04-15"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 1
---

# Phase 09 Plan 01: Git Forensics Agent Summary

**One-liner:** Git history forensics via bash shim + Python engine detecting binary blobs, force-push rewrites, .gitattributes execution vectors, and author anomalies with XML-isolated prompt injection defense.

## What Was Built

### Task 1: Bash Shim (`git_forensics.sh`)
- Validates target is a git repository (`rev-parse --is-inside-work-tree`), exits 1 with error message if not
- Collects 6 data sources to `/tmp/gsd-forensics-$$`: `git_log.txt`, `git_reflog.txt`, `git_branches.txt`, `git_objects_binary.txt` (binary blob detection), `gitattributes.txt`, `git_hooks.txt`
- Binary detection: top 200 largest blobs → `file` command → matches binary/ELF/PE32/Mach-O/archive signatures
- Invokes `git_forensics_report.py` via `python3`
- `trap 'rm -rf ...' EXIT` guarantees temp file cleanup

### Task 2: Python Detection Engine (`git_forensics_report.py`)
Four detection functions (static analysis, no code execution):
- **`detect_binary_blobs`** — parses `git_objects_binary.txt`; HIGH if >100KB or suspicious subject keywords
- **`detect_history_rewrites`** — parses `git_reflog.txt`; flags force-update/rebase/amend; HIGH on main/master/release
- **`detect_attribute_vectors`** — parses `gitattributes.txt`; flags smudge/clean/filter/diff/merge RHS; HIGH for shell metacharacters or absolute paths; LFS skipped as benign
- **`detect_author_anomalies`** — one-time contributors on sensitive paths (HIGH), timezone burst >6h from median (MEDIUM), email/name mismatches (MEDIUM)
- **`render_report`** — writes GIT-FORENSICS.md with 6 sections; untrusted data wrapped in XML tags (`<blob-subject>`, `<reflog-action>`, `<author>`, `<anomaly-reason>`) to prevent prompt injection

### Task 3: Workflow + Integration
- **`git-forensics.md`** — standalone workflow with `<purpose>`, `<process>`, `<output>`, `<security_notes>` structure
- **`threat-scan.md`** — new `git_forensics` step added between `prescan_threat` and `initialize`; `GIT_FORENSICS_FINDINGS` passed as `<git_forensics>` to both single-agent and parallel-dispatch agent prompts

## Deviations from Plan

None — plan executed exactly as written.

## Requirements Satisfied

| Requirement | Description | Status |
|-------------|-------------|--------|
| FOR-01 | Binary blob detection in git object database | ✅ |
| FOR-02 | History rewrite detection from reflog | ✅ |
| FOR-03 | .gitattributes execution vector detection | ✅ |
| FOR-04 | Author anomaly detection (one-time, timezone, name mismatch) | ✅ |
| FOR-05 | GIT-FORENSICS.md output with severity tiers | ✅ |
| FOR-06 | Standalone git-forensics workflow | ✅ |
| FOR-07 | threat-scan.md integration | ✅ |

## Integration Tests

41 tests in `tests/git-forensics.test.cjs` — all passing.

Covers: file existence, shebang, git validation, data collection, trap EXIT, python3 invocation, min line counts, all 4 detection functions, render_report, 6 report sections, XML injection isolation, workflow structure, threat-scan integration, GIT_FORENSICS_FINDINGS propagation, standalone invocation.

## Self-Check

- [x] `get-shit-done/bin/git_forensics.sh` — exists, 83 lines
- [x] `get-shit-done/bin/git_forensics_report.py` — exists, 280+ lines
- [x] `get-shit-done/workflows/git-forensics.md` — exists, 100+ lines
- [x] `get-shit-done/workflows/threat-scan.md` — updated with git_forensics step
- [x] `tests/git-forensics.test.cjs` — 41 tests, all passing
- [x] Commits: `9e8f54a`, `1741508`, `e610917`, `10beee4`

## Self-Check: PASSED
