---
id: SEED-007
status: dormant
planted: 2026-04-14
planted_during: pre-project (no milestone yet)
trigger_when: when skill quality feedback loops become important — after core skill library is stable and users/contributors start reporting friction, confusion, or missed cases
scope: Medium
---

# SEED-007: `/gsd-tune-skill` — Human-in-the-Loop Skill Improvement

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

This is the manual (human-in-the-loop) counterpart to the autonomous loop in SEED-008.
Both seeds can exist independently, but SEED-007 is lower risk and a natural precursor.

## When to Surface

**Trigger:** When GSD has an active user base reporting skill friction, or when a milestone
explicitly focuses on "skill quality" or "workflow reliability." Also surfaces when SEED-006
(build-skill) lands — you need tune-skill to improve what build-skill creates.

This seed should be presented during `/gsd-new-milestone` when the milestone scope matches:
- Milestone improving existing skill quality or reliability
- Milestone following completion of SEED-006 (skill authoring tooling in place — now add the tuning layer)
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
3. **Root cause diagnosis** — spawn `gsd-skill-tuner` agent with skill files + symptom:
   - Read `SKILL.md` + full `workflow.md` + any referenced `references/*.md`
   - Identify which step/instruction caused the failure
   - Classify failure type: ambiguous instruction / missing edge case / wrong tool permission / platform incompatibility / stale path / over-specified (constrains valid approaches) / under-specified (leaves agent guessing)
4. **Diff proposal** — agent proposes minimal targeted edit:
   - Show as unified diff: file path, old text, new text
   - Include rationale: "This step says X but doesn't handle Y. The edit adds a fallback condition."
   - Never rewrite entire sections — surgical edits only
5. **Human review gate** — show diff, ask: Approve / Reject / Refine
6. **Refinement loop** — if Reject/Refine: get user notes, re-diagnose, propose new diff (up to 3 iterations)
7. **Apply + commit** — apply approved edit, commit with message: `fix(skill): tune {skill-name} — {symptom summary}`
8. **Regression check** — if tests exist for the skill (`tests/skill-conventions.test.cjs` from SEED-006), run them to verify the edit doesn't break structural requirements

**New agent: `gsd-skill-tuner`**
- Specialist in GSD skill conventions and workflow analysis
- Input: skill files + symptom description (+ optional session transcript excerpt)
- Output: classified failure type + proposed diff + rationale
- Key constraint: minimal edits — changes the fewest words/lines needed to fix the failure

**Flags:**
- `--transcript <path>` — analyze a session transcript to auto-extract the symptom
- `--dry-run` — show proposed diff without applying
- `--batch` — process a list of reported issues from a file (for milestone-scale skill quality sprints)

## Breadcrumbs

Related code and decisions found in the current codebase:

- `get-shit-done/workflows/` — all existing workflows; tune-skill reads and edits these
- `~/.copilot/skills/*/SKILL.md` — all installed skills; tune-skill can target either installed or source versions
- `bin/install.js` — after tuning, skill changes need re-install to propagate; workflow should prompt: "Run `/gsd-update` to propagate changes to all platforms?"
- `tests/agent-frontmatter.test.cjs` — tests that skill tuning shouldn't break
- `.planning/seeds/SEED-006-build-skill-scaffolder.md` — precursor; `skill-authoring.md` reference from SEED-006 is what the skill-tuner uses as its convention baseline
- `.planning/seeds/SEED-008-*` (when planted) — the autonomous version of this skill; SEED-007 is the human-gated version SEED-008 automates

## Notes

The `tune-skill` concept mirrors how Karpathy describes `program.md` evolution in autoresearch:
"It's obvious how one would iterate on it over time to find the 'research org code' that achieves
the fastest research progress." In GSD's case, the "metric" is not val_bpb but *skill friction*
— how often does an agent using this skill need human correction, re-tries, or deviation handling?

Failure type taxonomy matters: a tuner that misdiagnoses "over-specified" as "ambiguous" will
make the problem worse. The `gsd-skill-tuner` agent needs a clear rubric for classification —
this rubric is itself a key artifact to design carefully.

Patch philosophy: git-style minimal diffs. If an instruction says "Run X" and should say
"Run X, or Y if X is not available", the edit adds the fallback — it doesn't rewrite the step.
This keeps the diff reviewable and the intent traceable.
