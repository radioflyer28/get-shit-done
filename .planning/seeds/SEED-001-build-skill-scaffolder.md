---
id: SEED-001
status: activated
planted: 2026-04-14
activated_during: v1.0
trigger_when: when GSD has a stable core workflow and expanding the skill ecosystem becomes a priority, or when external contributors start building skills
scope: Medium
---

# SEED-001: `/gsd-build-skill` — Guided Scaffold for Creating New GSD Skills

## Why This Matters

Creating a new GSD skill today requires understanding a non-obvious multi-file convention:
`SKILL.md` (command entry point) + `workflow.md` (orchestration logic) + `commands/gsd/*.md`
(slash command definition) + optional `agents/*.md` (sub-agents) + optional `references/*.md`
(context files). A new contributor has to reverse-engineer this from existing skills.

There's no canonical "how to build a GSD skill" guide — and even if there were, it wouldn't
catch common mistakes like missing `<required_reading>` tags, wrong tool permissions for the
target platform, or workflows that don't handle text-mode for non-Claude runtimes.

`/gsd-build-skill` would be to skills what `/gsd-new-project` is to projects: a guided,
structured creation flow that asks the right questions, generates the scaffold, and validates
the output against GSD conventions before you start writing actual logic.

The meta-usefulness is high: every new capability added to GSD (like the security scanner we
just built) could be bootstrapped via this skill, reducing the time from "I want to add X" to
"X is wired up and installable" from hours to minutes.

## When to Surface

**Trigger:** When a milestone focuses on GSD ecosystem growth, skill authoring tooling, or
external contributor support — or when there are 3+ new skills being added in the same milestone
(indicates the friction is real and tooling would pay off).

This seed should be presented during `/gsd-new-milestone` when the milestone scope matches:
- Milestone adding multiple new skills or major workflow capabilities
- Milestone improving GSD's extensibility or plugin/skill ecosystem
- Milestone focused on developer experience for GSD contributors
- Milestone enabling community/external skill contributions

## Scope Estimate

**Medium** — One focused phase. Includes:

**Core workflow: `get-shit-done/workflows/build-skill.md`**

Step flow:
1. **Intent gathering** — "What does this skill do?" → one-sentence description, slash command name
2. **Skill type classification** — pure orchestrator (spawns agents), standalone (does the work inline), hybrid, informational-only
3. **Agent inventory** — Does this need a new agent? Or does it orchestrate existing ones? → list existing agents that could be reused
4. **Tool permissions** — Which tools does the skill need? Validate against platform compatibility matrix
5. **File scaffold generation** — Create `commands/gsd/{name}.md`, `get-shit-done/workflows/{name}.md`, and optionally `agents/gsd-{name}.md`, `get-shit-done/references/{name}-patterns.md`
6. **Convention validation** — Run SEED-003's structural integrity checks (step 2) against
   generated files. Delegates to `/gsd-audit-skill --structural-only` if SEED-003 is
   implemented; otherwise falls back to inline checks for known GSD anti-patterns: missing
   `text_mode` handling, missing `<required_reading>` tag, hardcoded paths instead of
   `$HOME/.copilot/`, wrong `@~/.claude/` vs `@~/.copilot/` path for multi-runtime
7. **Registration check** — Flag if new agents need manual registration in `CODEX_AGENT_SANDBOX`, `MODEL_PROFILES`, `agent-contracts.md`
8. **Stub population** — Fill in template workflow steps based on skill type classification; leave `TODO:` markers for user to fill in
9. **Install validation** — Run `node bin/install.js --dry-run` to verify new files are picked up correctly

**New agent (optional): `gsd-skill-scaffolder`**
- Spawned by the workflow for the actual file generation
- Reads existing skills as exemplars, applies GSD conventions, generates contextually appropriate stubs

**New reference file: `references/skill-authoring.md`**
- Canonical GSD skill authoring guide (what the scaffolder uses as context)
- Documents: file structure, convention table, platform compatibility matrix, common anti-patterns, step templates

**Companion: `tests/skill-audit-conventions.test.cjs`** (shared with SEED-003)
- Validates all skills in `~/.copilot/skills/*/SKILL.md` conform to conventions
- Checks: `allowed-tools` present, `execution_context` path correct, `argument-hint` present if skill takes args
- If SEED-003 is implemented first, this test file already exists — SEED-001 reuses it

## Breadcrumbs

Related code and decisions found in the current codebase:

- `commands/gsd/` — 75 existing command files; source for pattern-matching during scaffold
- `get-shit-done/workflows/` — existing workflows; exemplars the skill-scaffolder should read
- `agents/` — existing agents; reuse candidates the workflow surfaces to the user
- `get-shit-done/references/` — existing reference files; authoring guide would live here
- `bin/install.js` — 14-platform installer; convention validation must understand what it installs and where
- `get-shit-done/bin/lib/model-profiles.cjs` — agent registration; scaffolder prompts when new agent needs registering
- `get-shit-done/references/agent-contracts.md` — agent contracts; same registration prompt
- `tests/agent-frontmatter.test.cjs` — existing frontmatter test; pattern for `tests/skill-audit-conventions.test.cjs`

## Notes

The `program.md` in Karpathy's autoresearch is essentially a lightweight skill — it provides
context and instructions to an autonomous agent. `/gsd-build-skill` is the meta-skill for
creating these. The quality of `program.md` determines research velocity; the quality of
GSD skill files determines workflow velocity.

Key design question for this phase: should `gsd-build-skill` generate a complete working skill
(higher bar, more complex scaffolder) or a well-structured stub with clear TODOs (lower bar,
faster to implement, still very useful)? Recommendation: stub-first, with a `--full` flag for
the scaffolder to attempt complete generation using the description + existing exemplars.

**SMART compliance (summary — authoritative criteria in SEED-003 / `references/skill-smart-criteria.md`):**
Generated skills should aim for SMART principles from the start:
- **Specific:** scaffold step instructions with concrete actions, not vague verbs
- **Measurable:** every step template includes an observable output (file, section, decision)
- **Achievable:** tool permissions match actual workflow needs; no impossible steps
- **Relevant:** no orphan steps; every step serves the stated objective
- **Time-bound:** include depth gates or iteration caps in templates for variable-scope work

Both `/gsd-build-skill` and `/gsd-audit-skill` (SEED-003) consume the same rubric from
`references/skill-smart-criteria.md` — ensuring skills are SMART from creation through audit.
If SEED-001 is implemented before SEED-003, create a minimal `references/skill-smart-criteria.md`
with these 5 dimensions. SEED-003 will expand it into the full rubric with sub-criteria and
scoring guidance.

**Skill lifecycle:** This seed is the **create** step. The full lifecycle:
SEED-001 (create) → SEED-003 (audit) → SEED-002 (tune) → SEED-004 (evolve).
