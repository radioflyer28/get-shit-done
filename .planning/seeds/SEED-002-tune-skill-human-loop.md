---
id: SEED-002
status: activated
planted: 2026-04-14
activated_during: v1.0
trigger_when: when skill quality feedback loops become important — after core skill library is stable and users/contributors start reporting friction, confusion, or missed cases
scope: Medium
---

# SEED-002: `/gsd-tune-skill` — Human-in-the-Loop Skill Improvement

## Why This Matters

A skill is a `program.md` (to use Karpathy's framing) — a set of instructions that determines
how an AI agent approaches a task. Like any program, skills drift out of calibration: new
platforms get added, agent behavior changes with model upgrades, users discover edge cases
the original author didn't anticipate, and workflow steps that seemed clear become a source
of agent confusion over time.

Currently, improving a skill means: open the SKILL.md + workflow.md files, read all of it,
mentally model what an agent would do, identify the gap, edit carefully. For large workflows
(like `new-project.md` at 1200+ lines), this is high-effort and error-prone.

`/gsd-tune-skill` provides a structured, interactive path to skill improvement:
- You describe what went wrong (or paste a session excerpt where the skill failed)
- A specialist agent reads the skill files and diagnoses the root cause
- It proposes a minimal, targeted diff — no over-engineering
- You review the diff, approve/reject, it commits

This is the manual (human-in-the-loop) counterpart to the autonomous loop in SEED-004.
Both seeds can exist independently, but SEED-002 is lower risk and a natural precursor.

## When to Surface

**Trigger:** When GSD has an active user base reporting skill friction, or when a milestone
explicitly focuses on "skill quality" or "workflow reliability." Also surfaces when SEED-001
(build-skill) lands — you need tune-skill to improve what build-skill creates.

This seed should be presented during `/gsd-new-milestone` when the milestone scope matches:
- Milestone improving existing skill quality or reliability
- Milestone following completion of SEED-001 (skill authoring tooling in place — now add the tuning layer)
- Milestone where "improve agent instruction quality" is a stated goal
- Milestone addressing user-reported friction with specific GSD workflows

## Scope Estimate

**Medium** — One phase. Includes:

**Core workflow: `get-shit-done/workflows/tune-skill.md`**

Step flow:
1. **Skill selection** — which skill to tune? List available skills, accept name or `$ARGUMENTS`
2. **Symptom collection** — structured intake:
   - "What happened?" (free text — describe the failure or friction)
   - "What should have happened?" (expected behavior)
   - Optional: paste session excerpt or error log
   - Optional: `--transcript <path>` to analyze a debug log directly
3. **Diagnosis via auditor** — delegate to SEED-003's `/gsd-audit-skill` as the evaluation
   engine (no duplicate diagnosis logic in the tuner):
   - Run `/gsd-audit-skill <skill-name>` to produce `SKILL-AUDIT.md` with structural checks,
     SMART scorecard, prompt quality findings, and tool usage audit
   - If a symptom was provided: the auditor results are filtered/prioritized to findings that
     could explain the reported symptom (e.g., symptom is "agent skipped step 4" → auditor's
     Achievable findings about context gaps in step 4 are surfaced first)
   - If `--transcript` was provided: extract friction signals from the transcript and
     cross-reference against auditor findings to narrow to the most likely root cause
   - Result: prioritized list of audit findings relevant to the symptom
4. **Diff proposal** — spawn `gsd-skill-tuner` agent with audit findings + symptom:
   - Agent receives `SKILL-AUDIT.md` findings (not raw skill files to re-diagnose)
   - Proposes minimal targeted edit as unified diff: file path, old text, new text
   - Include rationale: "Audit found [finding]. The edit resolves it by [change]."
   - Never rewrite entire sections — surgical edits only
   - Verify the proposed edit doesn't worsen any other SMART dimension
5. **Human review gate** — show diff, ask: Approve / Reject / Refine
6. **Refinement loop** — if Reject/Refine: get user notes, re-propose from remaining audit
   findings (up to 3 iterations)
7. **Apply + commit** — apply approved edit, commit with message: `fix(skill): tune {skill-name} — {symptom summary}`
8. **Post-fix audit** — re-run `/gsd-audit-skill <skill-name> --structural-only` to verify
   the edit didn't introduce new structural issues or SMART regressions. If tests exist
   (`tests/skill-audit-conventions.test.cjs` from SEED-003), run those too.

**New agent: `gsd-skill-tuner`**
- Specialist in proposing minimal, targeted fixes for audit findings — NOT a diagnoser
- Input: `SKILL-AUDIT.md` findings + symptom description (+ optional transcript excerpt)
- Output: proposed diff + rationale linking to specific audit findings
- Key constraint: minimal edits — changes the fewest words/lines needed to fix the finding.
  Does not re-evaluate the skill from scratch (that's the auditor's job).

**Flags:**
- `--transcript <path>` — analyze a session transcript to auto-extract the symptom
- `--dry-run` — show proposed diff without applying
- `--batch` — process a list of reported issues from a file (for milestone-scale skill quality sprints)

**SMART compliance:** When proposing fixes, the tuner should verify the edited skill still
meets SMART criteria (using `references/skill-smart-criteria.md` from SEED-001/SEED-003).
A fix that resolves one symptom but introduces vagueness or unbounded scope is not an
improvement.

**Skill lifecycle:** This seed is the **tune** step. The full lifecycle:
SEED-001 (create) → SEED-003 (audit) → SEED-002 (tune) → SEED-004 (evolve).
The auditor (SEED-003) produces structured findings that serve as direct input to tune-skill
via the `--fix` flag — automating the symptom-collection step with audit-derived diagnostics.

## Breadcrumbs

Related code and decisions found in the current codebase:

- `get-shit-done/workflows/` — all existing workflows; tune-skill reads and edits these
- `~/.copilot/skills/*/SKILL.md` — all installed skills; tune-skill can target either installed or source versions
- `bin/install.js` — after tuning, skill changes need re-install to propagate; workflow should prompt: "Run `/gsd-update` to propagate changes to all platforms?"
- `tests/agent-frontmatter.test.cjs` — tests that skill tuning shouldn't break
- `.planning/seeds/SEED-001-build-skill-scaffolder.md` — precursor; `skill-authoring.md` reference from SEED-001 is what the skill-tuner uses as its convention baseline
- `.planning/seeds/SEED-004-autoresearch-skill-loop.md` — the autonomous version of this skill; SEED-002 is the human-gated version SEED-004 automates

## Notes

The `tune-skill` concept mirrors how Karpathy describes `program.md` evolution in autoresearch:
"It's obvious how one would iterate on it over time to find the 'research org code' that achieves
the fastest research progress." In GSD's case, the "metric" is not val_bpb but *skill friction*
— how often does an agent using this skill need human correction, re-tries, or deviation handling?

**Why delegate diagnosis to the auditor (SEED-003) instead of building diagnosis into the tuner?**
Same reason GSD separates discuss→plan→execute: separation of concerns. The auditor owns the
evaluation rubric (SMART criteria, structural checks, prompt quality, tool usage). The tuner
owns the fix proposal. If both do diagnosis, the rubrics drift apart — what the auditor flags
as "fine" the tuner might flag as "broken", or vice versa. One source of truth for "what does
a good skill look like?" prevents this. The auditor is the judge; the tuner is the surgeon.

Patch philosophy: git-style minimal diffs. If an instruction says "Run X" and should say
"Run X, or Y if X is not available", the edit adds the fallback — it doesn't rewrite the step.
This keeps the diff reviewable and the intent traceable.
