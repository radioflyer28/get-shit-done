# Phase 2: Skill Auditor Core - Discussion Log

**Date:** 2026-04-15
**Mode:** discuss (interactive)
**Outcome:** 4 gray areas resolved → CONTEXT.md written

---

## Gray Areas Identified

1. Audit scope — what files the auditor reads
2. Scoring model — inline vs sub-agent
3. Verdict thresholds — PASS/FAIL criteria
4. SKILL-AUDIT.md report format

---

## Area 1: Audit Scope

**Question:** When running `/gsd-audit-skill gsd-plan-phase`, which files get audited?

Options presented:
- A: SKILL.md only
- B: SKILL.md + follow `<execution_context>` @-refs into workflow files
- C: All skill-related files (SKILL.md + workflow + agents + all referenced .md files)

**Decision: B** — SKILL.md + workflow file.

Rationale: The workflow IS the substance of a skill — SMART scoring and prompt quality
checks are meaningless without reading where the actual steps live. Option C was too
expensive (unbounded @-ref traversal). Agent files verified for existence only.

---

## Area 2: Scoring Model

**Question:** One agent for all checks, or specialized sub-agents?

Options presented:
- A: Single agent does all 4 check types sequentially
- B: Main auditor + gsd-skill-scorer sub-agent for SMART only
- C: Main auditor + 4 specialized sub-agents

**Decision: A** — Single agent, all checks sequentially.

Rationale: Simpler orchestration, no inter-agent coordination overhead, single context
window contains full picture for coherent report generation.

---

## Area 3: Verdict Thresholds

**Question:** What score/condition triggers each verdict?

Options presented:
- A: Structural blocker = FAIL, SMART avg < 3 = WARNINGS
- B: Any structural issue = FAIL, SMART worst-dim < 2 = FAIL, SMART avg < 3.5 = WARNINGS
- C: User-defined

**Decision: B** — Precise compound thresholds.

Rationale: Worst-dimension check catches critically weak skills that might have a
passable average. The 3.5 threshold for warnings is meaningfully higher than the < 3
in option A, setting a higher bar for clean PASS.

---

## Area 4: Report Format

**Question:** Quick scorecard vs full evidence vs scorecard + remediation plan?

Options presented:
- A: Scorecard-first with brief citations
- B: Full evidence with quoted excerpts per finding
- C: Scorecard-first + structured remediation plan

**User:** C, but what's best for agents doing fixes?

**Agent recommendation:** C with a structured remediation *table* (not prose), using
columns `ID | Priority | File | Issue | Fix` — this makes each finding parseable by a
future `gsd-audit-fix` agent without re-reading the full report. Prose excerpts (option B)
are better for humans but harder for agents to action programmatically.

**Decision: C with structured remediation table.**

---

## Decisions Locked

| ID | Area | Decision |
|----|------|----------|
| D-01 | Audit scope | B — SKILL.md + workflow file via execution_context |
| D-02 | Scoring model | A — Single agent, all checks |
| D-03 | Verdict thresholds | B — structural blocker OR worst-dim < 2 = FAIL; avg < 3.5 = WARNINGS |
| D-04 | Report format | C — scorecard + structured remediation table |
