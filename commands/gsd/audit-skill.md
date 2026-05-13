---
type: prompt
name: gsd:audit-skill
description: Audit a GSD skill for structure, SMART compliance, prompt quality, and tool usage — produces SKILL-AUDIT.md with PASS / PASS WITH WARNINGS / FAIL verdict
argument-hint: "<skill-name> [--output <path>] [--structural-only] [--depth quick|standard|deep] [--fix] [--json]"
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
- `--structural-only` — run only deterministic structural checks; alias for `--depth quick`; exits nonzero on structural failure; suitable for CI pipelines (per D-01, D-03)
- `--depth <quick|standard|deep>` — control audit depth: `quick` (structural checks only, fast, CI-suitable), `standard` (full audit, default), `deep` (full audit with expanded evidence and stricter warning surfacing) (per D-02)
- `--fix` — after audit completes, route all findings to `/gsd-tune-skill` for remediation; if tuner unavailable, prints soft warning to stderr and still saves SKILL-AUDIT.md (per D-04, D-05, D-06)
- `--json` — print all findings as structured JSON to stdout; `schema_version: "1.0"`, flat findings array; SKILL-AUDIT.md is still written to disk normally; can be combined with `--depth` (per D-07, D-08, D-09, D-10)
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
