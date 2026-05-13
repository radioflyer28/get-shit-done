# Phase 5: Skill Tuner - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can improve existing skills through a symptom-driven, human-in-the-loop workflow that produces targeted, non-regressive fixes backed by audit diagnosis. The tuner delegates diagnosis to `/gsd-audit-skill`, prioritizes findings by symptom relevance, proposes minimal diffs, collects human approval with iterative refinement, and verifies no structural regressions via post-fix audit.

</domain>

<decisions>
## Implementation Decisions

### Symptom Intake (User Input)
- **D-01:** Hybrid approach — User provides a free-form narrative description of the problem (e.g., "The agent kept failing on edge cases, should have handled X"). If audit findings are ambiguous, tuner optionally prompts for structured follow-up (Issue / Expected / Actual).

### Finding Prioritization (Diagnosis)
- **D-02:** Semantic analysis — Audit findings are re-ranked by semantic relevance to the user's symptom description, not simple string matching. This costs tokens but catches implicit connections and surfaces the most actionable findings first.

### Diff Presentation (Review)
- **D-03:** Syntax-highlighted inline edits — Proposed changes are displayed with color highlighting showing before/after inline (not unified diff, not side-by-side). This provides immediate visual understanding of what changes.

### Refinement Workflow (Iteration)
- **D-04:** Hybrid refinement options — When a user selects "Refine" (up to 3 iterations), they can either:
  - Choose from predefined refinement prompts (e.g., "expand context", "simplify language", "add guardrails")
  - Type free-form instructions (e.g., "make it shorter", "add more validation")
  - Both options are available in the same interaction

### Batch Mode Processing (Multiple Issues)
- **D-05:** Review-all-then-approve workflow — When `--batch` processes multiple issues from a file:
  1. Generate all proposed diffs upfront
  2. User reviews all diffs together
  3. User approves/rejects the entire batch at once
  4. Refinement (if needed) applies to remaining issues

### Flags and Output Formats
- **D-06:** Standard flags from ROADMAP are supported as committed requirements:
  - `--transcript <path>` extracts friction signals from session transcript, cross-references against audit findings
  - `--dry-run` shows proposed diffs without applying changes
  - `--batch` processes multiple issues from file with bulk approval
  - Approved edits committed atomically with message format `fix(skill): tune {skill-name} — {symptom summary}`
  - Post-fix verification runs `gsd-audit-skill --structural-only` to confirm no regressions

### Claude's Discretion
- Specific refinement prompt taxonomy (predefined options list) — downstream agents should design these based on common audit finding categories
- Token budget for semantic analysis — agents should balance accuracy vs. cost when re-ranking findings
- Exact UX for inline diff highlighting — agents should choose a format that works in their output context (markdown, terminal color codes, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Specifications
- `.planning/ROADMAP.md` §Phase 5 — Phase goal, requirements (TUNE-01 through TUNE-10), success criteria, and dependencies on Phase 2 & 3
- `.planning/PROJECT.md` — Shared context on skill lifecycle, SEED-002 definition, constraints (multi-runtime, non-destructive edits, test infrastructure)
- `references/skill-smart-criteria.md` — SMART evaluation framework used by audit; tuner validates fixes don't regress SMART dimensions
- `references/skill-authoring.md` — Structural conventions and platform compatibility matrix; tuner must respect these when proposing edits

### Audit Integration
- `agents/gsd-skill-auditor.md` — Agent that tuner invokes for diagnosis; tuner reads SKILL-AUDIT.md output, not raw skill files
- `commands/gsd/audit-skill.md` — Audit command interface; tuner relies on `--structural-only` flag for regression verification
- `get-shit-done/workflows/audit-skill.md` — Audit workflow; tuner understands workflow invocation and output routing

### Existing Patterns
- `get-shit-done/workflows/execute-phase.md` — Wave-based execution model; batch mode may reuse checkpoint patterns
- `agents/gsd-skill-scaffolder.md` — Scaffolder agent that validates via auditor; tuner should follow similar validation approach

</canonical_refs>

<code_context>
## Existing Code Insights

### Established Patterns
- **Auditor integration:** `/gsd-audit-skill` produces SKILL-AUDIT.md with findings table, verdict, and remediation guidance. Tuner reads this, not raw files.
- **Atomic commits:** Phase 4 (scaffolder) established atomic commit patterns. Tuner follows same message format: `fix(skill): tune {name} — {summary}`
- **Structural verification:** Phase 3 (auditor extensions) established `--structural-only` flag for regression verification. Tuner reuses this.
- **Batch/flag patterns:** Phase 3 already supports `--json`, `--depth`, `--fix`. Tuner's `--batch`, `--dry-run`, `--transcript` follow the same flag parsing infrastructure.

### Reusable Assets
- `references/skill-smart-criteria.md` — Scoring rubric that tuner uses to validate proposed fixes don't regress other dimensions
- `agents/gsd-skill-auditor.md` — Can be invoked by tuner for diagnosis; tuner doesn't duplicate audit logic

</code_context>

<specifics>
## Specific Ideas

- **Refinement loop max:** User locked at 3 iterations before requiring explicit `--force-override` to apply changes. This prevents infinite refinement cycles.
- **Semantic analysis cost:** When re-ranking findings by symptom relevance, consider using a lighter model or local semantic similarity if token budget is a concern. Can fall back to string similarity if semantic analysis fails.
- **Inline diff format:** Terminal vs. Copilot vs. other runtimes may render syntax highlighting differently. Tuner should detect runtime and adapt format accordingly.
- **Transcript extraction:** Session transcripts may come from VS Code debug logs, conversation histories, or other sources. Design extraction to be extensible.

</specifics>

<deferred>
## Deferred Ideas

### Autonomous Skill Tuning (SEED-004)
- Autonomous tuning without human approval is out of scope for v1. The tuner is human-in-the-loop by design. Future SEED-004 will reuse `gsd-skill-tuner` agent with `--force-override` and feedback loops.

### Skill Marketplace / Registry
- Sharing tuned skills or registering improvements to a registry is deferred to a future milestone. v1 focuses on single-user, single-skill improvement.

### External Contributor Onboarding
- Docs for non-developer contributors to use the tuner are not in scope. Build-skill and tune-skill are primarily for skill authors and maintainers.

---

*Phase: 05-skill-tuner*
*Context gathered: 2026-04-15*
</deferred>
