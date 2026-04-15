# Phase 2: Skill Auditor Core - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Build `/gsd-audit-skill <name>` — a command + workflow + auditor agent that takes a
skill name, reads its files, runs 4 check types, and produces a `SKILL-AUDIT.md` report
with a PASS / PASS WITH WARNINGS / FAIL verdict.

**Deliverables:**
- `commands/gsd/audit-skill.md` — slash command entry point
- `get-shit-done/workflows/audit-skill.md` — orchestration workflow
- `agents/gsd-skill-auditor.md` — single auditor agent (all check types)
- `SKILL-AUDIT.md` — output report (written into phase dir or cwd, TBD by planner)

**Out of scope (Phase 3+):**
- Batch auditing multiple skills
- `--json` output format for machine consumers
- Auto-fix capability
- AUDIT-07 through AUDIT-10 requirements
</domain>

<decisions>
## Decisions

### D-01: Audit scope — files the auditor reads
**Choice: B** — SKILL.md + follow `<execution_context>` @-references into workflow files.

The auditor reads:
1. `SKILL.md` (entry point — frontmatter, objective, process)
2. The file referenced in `<execution_context>` (workflow — this is where most SMART/prompt
   quality evidence lives: step clarity, context sufficiency, guardrails, tool usage)

The auditor does NOT chase further @-references inside workflow files (would be unbounded).
Agent files referenced via `Task()` in the workflow are verified for existence only (path
resolution), not audited for content.

### D-02: Scoring model — single agent handles all checks
**Choice: A** — One `gsd-skill-auditor` agent runs all 4 check types sequentially:
1. Structural integrity checks
2. SMART scoring (using `skill-smart-criteria.md` as rubric)
3. Prompt quality evaluation
4. Tool usage audit

No sub-agents. Simpler orchestration, single context window.

### D-03: Verdict thresholds
**Choice: B** — Precise thresholds:

| Condition | Verdict |
|-----------|---------|
| Any structural blocker (broken path, missing required field, unresolvable @-ref) | FAIL |
| SMART worst single dimension score < 2 | FAIL |
| SMART average score < 3.5 (no structural blocker) | PASS WITH WARNINGS |
| All clear — no structural issues, SMART avg ≥ 3.5, worst dim ≥ 2 | PASS |

FAIL conditions are OR'd — any one triggers FAIL. PASS WITH WARNINGS only applies when
no FAIL condition is present.

### D-04: SKILL-AUDIT.md report format — scorecard + structured remediation table
**Choice: C (with structured remediation table for agent consumption)**

Report structure:
1. **Header**: skill name, audit date, verdict badge
2. **Scorecard table**: dimension → score → status (one row per check area)
3. **Structural Findings** (if any): what failed and why
4. **SMART Scorecard**: 5 dimensions × score + evidence citation
5. **Prompt Quality Findings**: per-criterion result
6. **Tool Usage Findings**: per-pattern result
7. **Remediation Plan**: structured table — `ID | Priority | File | Issue | Fix`

The remediation table format (machine-parseable for future `gsd-audit-fix`):
```
| ID | Priority | File | Issue | Fix |
|----|----------|------|-------|-----|
| S-01 | CRITICAL | commands/gsd/plan-phase.md | Missing <objective> tag | Add <objective> block after frontmatter |
| SMART-02 | HIGH | get-shit-done/workflows/plan-phase.md | Specific score 2/5 — vague step language | Replace "handle errors" with explicit error conditions |
```

Priority levels: CRITICAL (structural blocker), HIGH (SMART dim < 2), MEDIUM (SMART dim 2-3.5 or prompt issue), LOW (style/convention).

### Agent's Discretion
- Whether `SKILL-AUDIT.md` is written to cwd or to a fixed output path — agent decides what's most useful
- Exact column widths/layout of scorecard table
- How to handle a skill with no workflow file (structural FAIL, or just SKILL.md-only audit)
- Order of prompt quality sub-criteria within their section
</decisions>

<specifics>
## Specific Ideas

- The auditor should cite the **exact line or excerpt** from the skill file for each SMART
  finding — not just "Specific score: 2" but "Specific score 2/5 — step 3 says 'handle
  errors appropriately' (workflow line ~47)". This makes remediation actionable.
- The command file should accept an optional `--output <path>` flag so users can redirect
  the report. Without it, write to `SKILL-AUDIT.md` in the current directory.
- Platform path convention carries forward from Phase 1: `~/.copilot/` (not `~/.claude/`),
  `allowed-tools:` field (not `tools:`).
- The auditor reads `skill-smart-criteria.md` at runtime (via @-ref in required_reading)
  rather than inlining the rubric — this keeps the rubric as single source of truth per D-03
  from Phase 1.
- Structural check coverage in the auditor should complement (not duplicate) the CI test:
  the CI test (`skill-audit-conventions.test.cjs`) handles deterministic file-level checks;
  the auditor handles semantic checks that require reading file content (path resolution,
  @-ref traversal, agent name resolution via actual file lookup).
</specifics>

<canonical_refs>
## Canonical References

**Phase 1 deliverables (direct inputs to Phase 2):**
- `get-shit-done/references/skill-smart-criteria.md` — SMART rubric (single source of truth for scoring)
- `get-shit-done/references/skill-authoring.md` — anti-patterns list used by prompt quality check
- `tests/skill-audit-conventions.test.cjs` — CI structural checks (auditor complements, not duplicates)

**Command pattern model:**
- `commands/gsd/audit-fix.md` — closest analog (audit-type command with argument-hint)

**Agent pattern models:**
- `agents/gsd-plan-checker.md` — structured auditor agent with required_reading + upstream_input pattern
- `agents/gsd-eval-auditor.md` — another auditor agent, good structural model

**Codebase conventions:**
- `.planning/codebase/CONVENTIONS.md` — JS style, naming patterns
- `.planning/codebase/STRUCTURE.md` — where files live
</canonical_refs>
