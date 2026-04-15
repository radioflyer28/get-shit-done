---
type: prompt
name: gsd:audit-skill
description: Audit a GSD skill for structure, SMART compliance, prompt quality, and tool usage — produces SKILL-AUDIT.md with PASS / PASS WITH WARNINGS / FAIL verdict
argument-hint: "<skill-name> [--output <path>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - Agent
---
<objective>
Audit a single GSD skill and produce a SKILL-AUDIT.md quality report covering four areas:
- Structural integrity (frontmatter, paths, required sections, agent resolution)
- SMART compliance (5 dimensions scored 1–5 with evidence citations)
- Prompt quality (clarity, guardrails, anti-patterns)
- Tool usage (Task() patterns, Bash() safety, file ops, state management)

Verdict: PASS / PASS WITH WARNINGS / FAIL

Flags:
- `--output <path>` — write report to specified path (default: SKILL-AUDIT.md in current directory)
</objective>

<execution_context>
@~/.copilot/get-shit-done/workflows/audit-skill.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`.
They are equivalent — `vscode_askquestions` is the VS Code Copilot implementation of the same
interactive question API. Do not skip questioning steps because `AskUserQuestion` appears
unavailable; use `vscode_askquestions` instead.
</runtime_note>

<context>
Skill name: $ARGUMENTS
</context>

<process>
Execute the audit-skill workflow from @~/.copilot/get-shit-done/workflows/audit-skill.md end-to-end.
</process>
