# Phase 5: Skill Tuner - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 05-skill-tuner
**Areas discussed:** Symptom Intake, Finding Prioritization, Diff Presentation, Refinement Workflow, Batch Mode

---

## Symptom Intake

| Option | Description | Selected |
|--------|-------------|----------|
| Free-form narrative | User types a description like "The agent kept failing on edge cases, should have handled X" — simple, natural | |
| Structured fields | Separate prompts for Issue / Expected / Actual — more explicit but adds steps | |
| Hybrid approach | Start with free-form narrative, optionally prompt for more specifics if audit findings are ambiguous | ✓ |

**User's choice:** Hybrid approach
**Notes:** Balance between simplicity and clarity. Free-form first for natural expression, then optional structured follow-up only if needed for disambiguation.

---

## Finding Prioritization

| Option | Description | Selected |
|--------|-------------|----------|
| String similarity | Fast, requires no extra tokens — keyword/phrase matching against audit findings | |
| Semantic analysis | More precise, understands meaning — costs tokens but catches implicit connections | ✓ |
| Manual categorization | Audit findings pre-tagged by type; tuner matches symptom against tags — requires audit refactor | |

**User's choice:** Semantic analysis
**Notes:** Prioritizes accuracy of diagnosis over raw speed. Willing to invest tokens for better symptom-to-finding matching that catches implicit connections.

---

## Diff Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Unified diff | Standard unified diff format — familiar, works everywhere, compact | |
| Syntax-highlighted inline | Color-highlighted inline edits showing before/after — visual, immediate understanding | ✓ |
| Side-by-side comparison | Side-by-side file view — full context but verbose | |
| Minimal context | Just the changed lines with minimal surrounding context | |

**User's choice:** Syntax-highlighted inline edits
**Notes:** Favors visual clarity and immediate comprehension over compact representation. Users should see changes pop out clearly in color.

---

## Refinement Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Free-form instructions | User types 'make it shorter', 'add more validation', etc. — flexible, user controls direction | |
| Predefined prompts | Predefined options like 'expand context', 'simplify language', 'add guardrails' — guided, consistent | |
| Hybrid (both options) | Menu with both — user can pick a preset or type custom instructions | ✓ |

**User's choice:** Hybrid (both options)
**Notes:** Supports both guided refinement (predefined prompts ensure consistency) and flexible refinement (custom instructions for unique needs). User can pick whichever fits their intent in each iteration.

---

## Batch Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Per-issue interactive | Each issue gets a prompt and approval step; interactive throughout | |
| Review-all-then-approve | Generate all diffs, user reviews/approves them all at once | ✓ |
| Shared refinement across issues | Generate and approve per issue, but refinement instructions apply to all remaining issues | |

**User's choice:** Review-all-then-approve
**Notes:** Batch mode focuses on efficiency — generate all diffs upfront, review as a cohesive set, then approve/reject in bulk. Faster for milestone-scale quality improvement sweeps.

---

## Claude's Discretion

- Specific refinement prompt taxonomy (e.g., "expand context", "simplify language", "add guardrails") — downstream planner decides based on audit finding categories
- Token budget and fallback strategy for semantic analysis — can fall back to string similarity if cost/latency exceeds targets
- Exact UX for inline diff highlighting — depends on runtime (terminal colors vs. Copilot formatting vs. other runtimes)

## Deferred Ideas

None during discussion — scope stayed within Phase 5 boundary.

