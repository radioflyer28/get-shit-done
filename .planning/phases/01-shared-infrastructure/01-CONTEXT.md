# Phase 1: Shared Infrastructure - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the three shared artifacts that all skill lifecycle tools depend on:
- `get-shit-done/references/skill-smart-criteria.md` — SMART quality rubric consumed by the auditor, scaffolder, and tuner
- `tests/skill-audit-conventions.test.cjs` — Deterministic structural checks for skills, runs in CI
- `get-shit-done/references/skill-authoring.md` — Canonical reference for building GSD skills

No commands, no agents, no workflows. Pure reference + test infrastructure.

</domain>

<decisions>
## Implementation Decisions

### SMART rubric depth (skill-smart-criteria.md)
- **D-01:** Deliver the full spec in Phase 1: all 5 SMART dimensions with sub-criteria and a 1-5 scoring scale definition
- **D-02:** Good/bad examples for each dimension are deferred to Phase 2 — the auditor (Phase 2) will populate them with real evidence from auditing existing skills
- **D-03:** The rubric is the single source of truth — both the auditor agent and the scaffolder read it; no duplication of SMART definitions elsewhere

### Convention test scope (skill-audit-conventions.test.cjs)
- **D-04:** Medium scope — test checks structure + known anti-patterns. No SMART quality scoring in the test; that belongs to the auditor agent
- **D-05:** Structural checks to include: required frontmatter keys present (`name`, `description`, `allowed-tools`), `<objective>` tag present, `<execution_context>` path resolves to a real file, `<process>` tag present, no hardcoded `~/.claude/` paths (must use runtime-appropriate path), no heredoc patterns in file-writing instructions, `text_mode` handling present if skill has platform-specific runtime notes
- **D-06:** Day-1 scope: only skills created in this milestone (v1.0) are required to pass. Existing 50+ installed skills are grandfathered — violations reported but do not fail CI. This avoids blocking Phase 1 on pre-existing issues.
- **D-07:** Test follows the existing `node:test` + `node:assert/strict` pattern — no vitest, no external test frameworks. File goes in `tests/`, follows `{feature}.test.cjs` naming.

### Authoring guide format (skill-authoring.md)
- **D-08:** Reference with examples format — structured tables + platform compatibility matrix + anti-patterns list, anchored by concrete worked examples pulled from well-written existing skills
- **D-09:** Primary exemplars to draw from: `gsd-plan-phase` and `gsd-execute-phase` (most complete, most used)
- **D-10:** Sections to include: file structure table, required vs optional files, frontmatter field reference, platform compatibility matrix, anti-patterns table, worked example from an existing skill

### the agent's Discretion
- Exact scoring language for each 1-5 level (1 = what, 5 = what) — agent decides based on what makes the rubric most actionable
- Order of dimensions in the rubric file
- Whether `skill-authoring.md` includes a quick-start section at the top (agent decides if it aids navigability)
- Test file internals: how to detect hardcoded `~/.claude/` paths (regex pattern choice)

</decisions>

<specifics>
## Specific Ideas

- The test's grandfathering mechanism should use an allowlist or snapshot pattern — either an explicit list of "known failing skills" that are excluded, or a baseline snapshot approach. Whichever is cleaner given the existing test helper patterns.
- The SMART rubric should be written to be read by an AI agent, not just a human — terse, unambiguous, with each sub-criterion stated as a checkable condition.
- `skill-authoring.md` is consumed by `gsd-skill-scaffolder` (Phase 4) as its convention baseline — keep it structured enough that an agent can extract specific facts without reading the whole document.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing test patterns (model for test file structure)
- `tests/agent-frontmatter.test.cjs` — Closest analog: deterministic frontmatter checks for agent files; same structural check pattern needed for skill files
- `tests/anti-pattern-enforcement.test.cjs` — Anti-pattern detection patterns (heredoc checks, path checks)
- `tests/helpers.cjs` — Shared test utilities (`createTempProject`, `cleanup`, `runGsdTools`)

### Existing reference files (model for reference file format)
- `get-shit-done/references/agent-contracts.md` — Closest analog: structured reference doc for agent conventions

### Codebase conventions
- `.planning/codebase/TESTING.md` — Test runner, required imports, naming conventions, run commands
- `.planning/codebase/CONVENTIONS.md` — JS style, naming patterns, file structure rules

### Phase requirements
- `.planning/REQUIREMENTS.md` §Shared Infrastructure — INFRA-01, INFRA-02, INFRA-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tests/helpers.cjs` — `createTempProject()`, `cleanup()`, `runGsdTools()` — use these in the new test file, don't reinvent
- `tests/agent-frontmatter.test.cjs` — Direct pattern template: reads agent files, checks frontmatter fields, reports violations. Adapt this for skill files.
- `tests/anti-pattern-enforcement.test.cjs` — Anti-pattern detection via file content grep — adapt for `~/.claude/` path checks and heredoc detection

### Established Patterns
- All reference files live in `get-shit-done/references/` — no exceptions
- Test files: flat in `tests/`, CommonJS `.test.cjs`, `'use strict'` at top, `node:test` + `node:assert/strict`
- No external dependencies in core — test file must use only Node.js built-ins
- `REPO_ROOT = path.join(__dirname, '..')` for path resolution in tests

### Integration Points
- Phase 2 (auditor) reads `skill-smart-criteria.md` — the rubric structure locks what the auditor's scoring system looks like
- Phase 4 (scaffolder) reads `skill-authoring.md` — the format locks what the scaffolder agent uses as context
- Phase 2 adds good/bad examples to `skill-smart-criteria.md` — leave clear section placeholders

</code_context>

<deferred>
## Deferred Ideas

- Good/bad SMART examples — deferred to Phase 2 (auditor populates from real evidence)
- Automated checks for ALL installed skills (not just v1.0) — deferred to a cleanup phase after auditor is built
- Skill versioning or changelog tracking — explicitly out of scope for v1.0

</deferred>

---

*Phase: 01-shared-infrastructure*
*Context gathered: 2026-04-15*
