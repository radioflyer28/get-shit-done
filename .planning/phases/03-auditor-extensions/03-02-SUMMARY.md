---
phase: "03"
plan: "03-02"
status: complete
commit: 66ed2a1
---

# Plan 03-02 Summary: Extend gsd-skill-auditor with Depth-Conditional Execution

## What Was Built

Extended `agents/gsd-skill-auditor.md` to accept a `depth` parameter and execute checks conditionally based on quick/standard/deep mode. The agent now supports three distinct execution depths driven by the `depth` field in the `<audit_context>` input block.

## Key Changes

### agents/gsd-skill-auditor.md

**`<input>` block:** Added `depth` parameter documentation:
- `quick` = structural checks only (SMART/prompt/tool skipped)
- `standard` = all 4 check types (existing behavior, default)
- `deep` = all 4 check types with expanded evidence + stricter thresholds

**`read_skill_files` step:** Added DEPTH extraction at the top of the step with fallback to `"standard"` for absent or invalid values (T-03-05). Invalid values are noted in structural findings.

**`smart_scoring` step:**
- Quick guard at top: skips all SMART scoring, sets smart_avg/smart_worst = null, routes directly to write_report
- Deep expansion at bottom: 2-3 evidence excerpts per SMART dimension (vs 1 in standard); borderline warning annotation for dimensions scoring exactly 3; `borderline_warnings` list collected for use in compute_verdict

**`prompt_quality` step:**
- Quick guard at top: skips all prompt quality evaluation, sets high_prompt_count = 0
- Deep escalation at bottom: MEDIUM findings affecting >1 workflow step escalate to HIGH; step-level word count annotations for all steps (HIGH >200w, MEDIUM 150-200w, none <150w)

**`tool_usage` step:**
- Quick guard at top: skips all tool usage evaluation

**`compute_verdict` step:**
- Quick binary at top: PASS if structural_fail_count = 0, FAIL otherwise — no PASS WITH WARNINGS (CI-suitable binary signal, per D-01)
- Deep stricter threshold at bottom: PASS WITH WARNINGS uses smart_avg < 3.8 (not 3.5); borderline warnings appended to report if borderline_warnings is non-empty even when VERDICT = "PASS"

**`write_report` step:**
- Quick mode: condensed scorecard with structural row only; "Quick mode: SMART scoring, prompt quality, and tool usage checks skipped." note added
- Standard/deep mode: full 8-row scorecard unchanged

## Requirements Covered
- AUDIT-07: `--structural-only` / quick mode execution path (D-01)
- AUDIT-08: `--depth quick|standard|deep` agent-side execution (D-02)

## Self-Check: PASSED

- [x] All tasks executed
- [x] `<input>` block documents depth with default "standard" and all 3 values
- [x] `read_skill_files` extracts DEPTH with fallback (T-03-05)
- [x] quick mode: SMART/prompt/tool all skipped; binary PASS/FAIL only; condensed scorecard
- [x] deep mode: 2-3 evidence excerpts per dimension; 3.8 threshold; borderline warnings
- [x] All existing standard-mode content preserved unchanged
- [x] All gsd-skill-auditor tests pass (8/8)
- [x] All agent-frontmatter tests pass (145/145)
- [x] skill-audit-conventions tests pass (450/450)
- [x] Committed atomically (`66ed2a1`)

## key-files.created
- agents/gsd-skill-auditor.md (modified)
