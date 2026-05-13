---
plan: 02-01
phase: 02-skill-auditor-core
status: complete
completed: 2026-04-15
commit: 56f7967
---

## Summary

Created the slash command entry point and orchestration workflow for `/gsd-audit-skill`.

## What Was Built

### commands/gsd/audit-skill.md
Slash command that makes `/gsd-audit-skill <skill-name> [--output <path>]` available in
Claude Code and VS Code Copilot. Correct frontmatter (`allowed-tools:`, `gsd:audit-skill`
name, `argument-hint`). Dispatches to the workflow via `<execution_context>` @-ref.
Includes `<runtime_note>` for VS Code Copilot `vscode_askquestions` compatibility.

### get-shit-done/workflows/audit-skill.md
4-step orchestration workflow:
1. **parse-arguments** — extracts SKILL_NAME and OUTPUT_PATH from $ARGUMENTS
2. **resolve-skill-files** — validates skill name with `^[a-z0-9][a-z0-9-]*$` pattern
   (rejects path traversal: `..`, `/`, `\`, spaces, `~`), resolves SKILL.md at
   `$HOME/.copilot/skills/{name}/SKILL.md` with `.claude` fallback, extracts
   `<execution_context>` @-ref via `awk` to find the workflow file path
3. **spawn-auditor** — calls `Task(subagent_type="gsd-skill-auditor", ...)` with
   `<audit_context>` block containing all 4 resolved paths
4. **handle-return** — handles `## AUDIT COMPLETE` and `## AUDIT FAILED` completion markers

## Key Files

- `commands/gsd/audit-skill.md` — slash command entry point (created, 40 lines)
- `get-shit-done/workflows/audit-skill.md` — orchestration workflow (created, 121 lines)

## Self-Check

- [x] Command file: `name: gsd:audit-skill`, `allowed-tools:`, `@~/.copilot/` path — ALL PASS
- [x] Workflow: all 4 steps present, path traversal guard, copilot primary + claude fallback, awk extraction, gsd-skill-auditor spawn, both completion markers — ALL PASS
- [x] Security: skill name validated before any path construction (T-02-01 mitigated)
- [x] No `~/.claude/` as primary path (Copilot convention)
- [x] No `skills:` in frontmatter of either file
- [x] Committed: 56f7967
