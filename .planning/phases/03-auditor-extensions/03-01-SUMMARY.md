---
phase: "03"
plan: "03-01"
status: complete
commit: a3c8df6
---

# Plan 03-01 Summary: Extend audit-skill Command + Workflow with 4 Flags

## What Was Built

Extended `commands/gsd/audit-skill.md` and `get-shit-done/workflows/audit-skill.md` to expose four new operational flags: `--structural-only`, `--depth`, `--fix`, and `--json`.

## Key Changes

### commands/gsd/audit-skill.md
- Updated `argument-hint` to include all 4 new flags
- Added full flag documentation in the `<objective>` section with D-01 through D-10 decision references

### get-shit-done/workflows/audit-skill.md

**parse-arguments step:** Now extracts:
- `DEPTH` from `--depth quick|standard|deep` (default: `standard`)
- `--structural-only` treated as alias for `--depth quick` (D-03)
- Depth validation: rejects values outside `{quick,standard,deep}` with a clear error message
- `FIX_MODE` from `--fix` flag
- `JSON_MODE` from `--json` flag
- Updated usage string to include all new flags

**spawn-auditor step:** Now passes `depth: {DEPTH}` in the `<audit_context>` block so the agent receives the depth parameter.

**handle-return step:** Now handles two new output modes:
- **JSON output** (JSON_MODE=true): serializes audit findings to stdout as structured JSON with `schema_version: "1.0"`, using `JSON.stringify` (never string concatenation, per T-03-02)
- **Fix routing** (FIX_MODE=true): checks for `gsd-tune-skill` availability; routes all findings if present; prints soft warning to **stderr** (not stdout) if missing to avoid corrupting piped JSON output (D-05)
- Updated display summary includes JSON and fix status lines conditionally

## Requirements Covered
- AUDIT-07: `--structural-only` flag (D-01, D-03)
- AUDIT-08: `--depth quick|standard|deep` flag (D-02, D-03)
- AUDIT-09: `--fix` flag routing (D-04, D-05, D-06)
- AUDIT-10: `--json` structured output (D-07, D-08, D-09, D-10)

## Self-Check: PASSED

- [x] All tasks executed
- [x] Both target files modified with correct content
- [x] Committed atomically (`a3c8df6`)
- [x] DEPTH validation guards invalid values (T-03-01)
- [x] JSON serialization uses JSON.stringify (T-03-02)
- [x] Fix warning targets stderr not stdout (D-05)
- [x] --structural-only is alias path, not duplicate logic (D-03)
- [x] spawn-auditor passes `depth` param to agent context

## key-files.created
- commands/gsd/audit-skill.md (modified)
- get-shit-done/workflows/audit-skill.md (modified)
