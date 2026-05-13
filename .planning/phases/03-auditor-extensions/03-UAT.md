---
status: complete
phase: 03-auditor-extensions
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md
started: 2026-04-15T00:00:00Z
updated: 2026-04-15T00:00:00Z
---

## Current Test
<!-- UAT complete - all tests passed -->

none

## Tests

### 1. Structural-only mode output
expected: Run /gsd-audit-skill gsd-security-scanner --structural-only. Output behaves as quick/structural-only (structural checks only, binary verdict, quick-mode skip note).
result: pass

### 2. Depth validation guard
expected: Run /gsd-audit-skill gsd-security-scanner --depth ultra. Command rejects value with clear error and does not run audit.
result: pass

### 3. JSON output mode
expected: Run /gsd-audit-skill gsd-security-scanner --json. Stdout is valid JSON containing schema_version "1.0" and structured findings.
result: pass

### 4. Fix routing fallback
expected: Run /gsd-audit-skill gsd-security-scanner --fix when /gsd-tune-skill is unavailable. Audit still completes and emits a soft warning to stderr.
result: pass

### 5. Deep mode evidence expansion
expected: Run /gsd-audit-skill gsd-security-scanner --depth deep. Report includes expanded evidence detail and stricter warning surfacing compared with standard mode.
result: pass

### 6. Default depth behavior
expected: Run /gsd-audit-skill gsd-security-scanner with no depth flags. Behavior matches standard mode by default.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
