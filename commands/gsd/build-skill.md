---
type: prompt
name: gsd:build-skill
description: Generate a complete, convention-compliant GSD skill from a name, description, and type — command file, workflow, and optional agent, all fully populated from your description
argument-hint: "[--template]"
allowed-tools: Read, Write, Bash, Glob, Grep, Task, AskUserQuestion
---
<objective>
Create a new GSD skill by collecting a name, description, and type interactively, then
generating all required files with complete, working content derived from the description.

**Default flow:** Gather inputs → check agent reuse (if needed) → generate files → validate
structure → register new agent (if created) → confirm install recognition

**Orchestrator role:** Collect inputs, check for reusable existing agents via frontmatter-only
scan, spawn gsd-skill-scaffolder to generate files, validate structural integrity via
/gsd-audit-skill or inline fallback, prompt for registration if a new agent was created.

**Success state:** All required files exist on disk, pass structural integrity checks, and
`node bin/install.js --dry-run` confirms they are recognized by the install system.
</objective>

<execution_context>
@~/.copilot/get-shit-done/workflows/build-skill.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`.
They are equivalent — `vscode_askquestions` is the VS Code Copilot implementation of the same
interactive question API. Do not skip questioning steps because `AskUserQuestion` appears
unavailable; use `vscode_askquestions` instead.
</runtime_note>

<context>
Flags:
- `--template` — Generate bare skeleton stubs with `TODO:` markers instead of auto-generated
  content. Use when you want a blank template to fill in manually rather than AI-generated content.
</context>

<process>
Execute the build-skill workflow from @~/.copilot/get-shit-done/workflows/build-skill.md end-to-end.
Preserve all workflow gates (input validation, agent reuse check, structural validation, registration prompts).
</process>
