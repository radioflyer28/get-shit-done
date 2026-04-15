# GSD Skill Lifecycle Tooling

## What This Is

Tooling for the complete GSD skill lifecycle — create, audit, and tune skills through guided workflows and specialist agents. GSD skills are the "programs" that agents execute; this milestone adds the infrastructure to build them correctly, validate they meet quality standards, and improve them systematically when issues surface.

## Core Value

Every GSD skill meets a consistent quality bar — structurally correct, SMART-compliant, and improvable through a repeatable feedback loop.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Guided skill scaffolding via `/gsd-build-skill` (SEED-001)
- [ ] Skill quality auditing via `/gsd-audit-skill` (SEED-003)
- [ ] Human-in-the-loop skill tuning via `/gsd-tune-skill` (SEED-002)
- [ ] Shared SMART criteria rubric (`references/skill-smart-criteria.md`)
- [ ] Convention validation test suite (`tests/skill-audit-conventions.test.cjs`)

### Out of Scope

- Autonomous skill tuning (SEED-004) — deferred to future milestone; requires manual tuning to be proven first
- Skill marketplace or registry — no sharing mechanism in v1
- External contributor onboarding flows — build-skill handles creation, not contributor docs
- Scanner-related seeds (SEED-006 through SEED-010) — separate concern, separate milestone

## Context

- GSD is a meta-prompting system for AI coding agents (Claude Code, Copilot, Gemini CLI, etc.)
- Skills are multi-file artifacts: `SKILL.md` + `workflow.md` + `commands/gsd/*.md` + optional agents + references
- There are 50+ existing skills — conventions are implicit, no formal validation exists
- SEED-003 (auditor) is the shared evaluation backbone — SEED-002 delegates diagnosis to it
- Skill lifecycle order: create (001) → audit (003) → tune (002)
- The `gsd-skill-tuner` agent is shared between SEED-002 (interactive) and future SEED-004 (autonomous)

## Constraints

- **Multi-runtime**: Skills must work across Claude Code, Copilot, Gemini CLI, and other supported runtimes — scaffolder and auditor must validate cross-platform compatibility
- **Existing conventions**: Must align with the 50+ existing skills — don't invent new patterns, codify what works
- **Non-destructive**: Tuner edits are surgical diffs, not rewrites — never regress other SMART dimensions
- **Test infrastructure**: Convention tests run via `vitest` with existing `tests/` patterns (`.test.cjs` files)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SEED-003 auditor is shared backbone | Avoids duplicate diagnosis logic in tuner and future autoresearch | — Pending |
| SMART criteria as evaluation framework | Specific, Measurable, Achievable, Relevant, Time-bound maps well to prompt quality | — Pending |
| Surgical diffs over full rewrites | Minimizes risk of unintended side effects when tuning skills | — Pending |
| Shared `skill-smart-criteria.md` reference | Single source of truth for rubric; ships with whichever seed lands first | — Pending |

---
*Last updated: 2025-04-15 after milestone v1.0 initialization*
