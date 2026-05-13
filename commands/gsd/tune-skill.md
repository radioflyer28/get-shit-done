---
type: prompt
name: gsd:tune-skill
description: Human-in-the-loop skill improvement via symptom-driven diagnosis backed by audit findings
argument-hint: "<skill-name> [--transcript <path>] [--dry-run] [--batch <file>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - Task
  - AskUserQuestion
---
<objective>
Improve existing skills through targeted, non-regressive fixes backed by audit diagnosis.

Workflow: (1) User describes symptom (what went wrong), (2) Tuner invokes auditor for diagnosis, (3) Findings prioritized by symptom relevance, (4) Minimal diffs proposed with audit rationale, (5) User reviews with refinement option (up to 3 iterations), (6) Approved edits committed atomically, (7) Post-fix structural audit verifies no regressions.

Flags:
- `--transcript <path>` — Extract friction signals from session transcript; augment symptom detection with extracted signals (e.g., timeouts, errors, unexpected behavior)
- `--dry-run` — Show proposed diffs without applying or committing changes; skip steps 6–7
- `--batch <file>` — Load multiple issues from JSON file (array of {skill, symptom} objects); process all, review diffs together, approve/reject in bulk, commit atomically per batch

Success criteria: User can describe a skill problem, see relevant audit findings, approve targeted fixes, and verify no regressions were introduced.
</objective>

<execution_context>
@~/.copilot/get-shit-done/workflows/tune-skill.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`.
They are equivalent — `vscode_askquestions` is the VS Code Copilot implementation of the same
interactive question API. Do not skip questioning steps because `AskUserQuestion` appears
unavailable; use `vscode_askquestions` instead.
</runtime_note>

<context>
Skill name and flags: $ARGUMENTS
</context>

<process>
Execute the tune-skill workflow from @~/.copilot/get-shit-done/workflows/tune-skill.md end-to-end.
</process>
