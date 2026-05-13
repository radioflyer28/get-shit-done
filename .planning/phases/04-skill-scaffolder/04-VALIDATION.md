---
phase: "04"
slug: skill-scaffolder
status: active
nyquist_compliant: false
wave_0_complete: false
created: "2026-04-15"
---

# Phase 04: Skill Scaffolder — Validation Strategy

## Test Infrastructure

**Framework:** Node.js test runner (`node:test` + `node:assert/strict`)
**Config file:** `vitest.config.ts` / `package.json` test scripts
**Run command:** `npm test`
**Estimated runtime:** ~30s (existing suite) + new tests

---

## Sampling Rate

All acceptance criteria are verifiable via grep, file read, or CLI command. 100% sampling applies to all generated output checks (structural validation runs on every scaffold).

---

## Per-Task Verification Map

| Task | Acceptance Criteria | Verification Method |
|------|---------------------|---------------------|
| Create `commands/gsd/build-skill.md` | File exists; contains `type: prompt`, `name: gsd:build-skill`, `<objective>`, `<execution_context>`, `<runtime_note>`, `<process>` | `grep` + file read |
| Create `get-shit-done/workflows/build-skill.md` | File exists; contains `<purpose>`, `<available_agent_types>`, named `<step>` blocks | `grep` + file read |
| Create `agents/gsd-skill-scaffolder.md` | File exists; `agent-frontmatter.test.cjs` passes; contains `<role>`, `<input>`, `<execution_flow>`, `<structured_returns>`, `<success_criteria>` | test suite + `grep` |
| Register agent in `agent-contracts.md` | `grep -c "gsd-skill-scaffolder" get-shit-done/references/agent-contracts.md` returns ≥ 1 | `grep` |
| Register agent in `bin/install.js` | `grep -c "'gsd-skill-scaffolder'" bin/install.js` returns ≥ 1 | `grep` |
| Input validation (skill name) | Validates `^[a-z0-9][a-z0-9-]*$`; rejects `../foo`, `/etc/passwd`, `foo bar`, `~` | workflow step text + new test |
| Platform compat check | Workflow step checks generated content for `~/.claude/`, `tools:`, `skills:`, heredocs before writing | workflow step text |
| Structural validation | Generated files pass `tests/skill-audit-conventions.test.cjs` (automatic — test scans all installed agents) | `npm test` |
| Agent frontmatter | `tests/agent-frontmatter.test.cjs` passes for new agent | `npm test` |
| Install validation | `node bin/install.js --dry-run` output mentions new files | manual + CLI |

---

## Wave 0 Requirements

No Wave 0 (no blocking schema push or infrastructure setup required). All three new files (command, workflow, agent) can be created in Wave 1.

---

## Manual-Only Verifications

| Verification | Why Manual | Notes |
|---|---|---|
| `node bin/install.js --dry-run` output | Requires running install script | Run after all files created |
| Agent reuse frontmatter-only scan (SCAFFOLD-02) | Requires live invocation with a description | Verify by running `/gsd-build-skill` with a description that matches an existing agent |
| Full auto-generation quality | Requires LLM judgment | Spot-check generated content for SMART compliance |

---

## Validation Sign-Off

- [ ] All tests pass (`npm test`)
- [ ] `agents/gsd-skill-scaffolder.md` passes `agent-frontmatter.test.cjs`
- [ ] Generated files pass `skill-audit-conventions.test.cjs`
- [ ] `agent-contracts.md` updated with `gsd-skill-scaffolder` entry
- [ ] `bin/install.js` `CODEX_AGENT_SANDBOX` updated with `gsd-skill-scaffolder`
- [ ] `node bin/install.js --dry-run` confirms new files are recognized
