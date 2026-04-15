# Skill Authoring Guide

Reference for building GSD skills. Consumed by the Phase 4 scaffolder and human skill authors.

All conventions here are derived from observation of the 75 installed skills. When in doubt, inspect an installed skill before writing one.

---

## Quick Start

Three steps to create a working skill:

**1.** Create the skill directory and file:
```
~/.copilot/skills/gsd-{name}/SKILL.md
```

**2.** Add frontmatter (between `---` delimiters):
```yaml
---
name: gsd-{name}
description: One sentence describing what this skill does.
allowed-tools: Read, Write, Bash
---
```

**3.** Add required body sections:
```xml
<objective>
What this skill does, for whom, and what it produces.
</objective>

<process>
Execute the steps to accomplish the objective.
</process>
```

That's a valid, loadable skill. Add optional sections as needed.

**Minimal SKILL.md template (copy-paste baseline):**
```markdown
---
name: gsd-{name}
description: {One sentence, imperative verb, specific output.}
allowed-tools: Read, Write, Bash
---

<objective>
{What the skill does. What triggers it. What it produces. No ambiguity.}
</objective>

<process>
{Ordered steps. Each step: specific verb + target + tool. No vague verbs like "handle" or "manage".}
</process>
```

---

## File Structure

| File | Required | Description |
|------|----------|-------------|
| `SKILL.md` | Yes | The entire skill — frontmatter + body in one file. No other files in the skill directory. |

All 75 installed skills are single-file. Do not add README, config, or data files to a skill directory.

---

## Frontmatter Field Reference

| Field | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `name:` | Yes | string | Skill identifier. Must match directory name exactly. | `gsd-plan-phase` |
| `description:` | Yes | string | One-line purpose shown in skill listings. Imperative verb, specific. | `Create detailed phase plan (PLAN.md) with verification loop` |
| `allowed-tools:` | Yes | comma-separated | Tools this skill may use. See Platform Compatibility Matrix. | `Read, Write, Bash, Task` |
| `argument-hint:` | Optional | string | Usage hint shown in listings. Use `<required> [optional]` syntax. | `"[phase] [--auto] [--skip-research]"` |
| `agent:` | Optional | string | Default agent to invoke. Only present when skill delegates to a specific named agent. | `gsd-planner` |

**Critical field naming rules:**
- Use `allowed-tools:` — NOT `tools:` (agent-style, breaks skill loading) and NOT `skills:` (breaks Gemini CLI)
- `name:` value must match the skill directory name exactly — case-sensitive

---

## Required Body Sections

| Section | Tag | Description | Always required? |
|---------|-----|-------------|-----------------|
| Objective | `<objective>` | What the skill does, for whom, and what it produces. Include trigger condition and success state. | Yes |
| Process | `<process>` | Ordered execution instructions. Either concrete steps or a workflow delegation instruction referencing a `@`-loaded file. | Yes |

**`<objective>` good practice:** Include three elements — what the skill does, the orchestrator/delegation role (if any), and what a success state looks like.

**`<process>` good practice:** Either enumerate concrete steps (`1. Do X using Y tool`) or delegate to an `@`-loaded workflow with `Execute the {name} workflow from @~/.copilot/...`.

---

## Optional Body Sections

| Section | Tag | Description | When to include |
|---------|-----|-------------|-----------------|
| Execution Context | `<execution_context>` | `@`-path references to workflow and reference files loaded at invocation. One path per line, starting with `@`. | When the skill loads external files (most orchestrator skills do). |
| Runtime Note | `<runtime_note>` | Platform-specific behavioral differences. How to adapt for Copilot vs Claude Code vs Cursor vs Gemini CLI. | When behavior differs meaningfully by platform. Include `text_mode` handling if present. |
| Context | `<context>` | Arguments, flags, variables, and structured input the skill receives. Documents `$ARGUMENTS` parsing. | When the skill accepts arguments or flags. |

**`<execution_context>` path rule:** Always use `~/.copilot/` prefix, never `~/.claude/`. Use `@~/.copilot/skills/{name}/SKILL.md` for self-references, `@~/.copilot/get-shit-done/` for workflow and reference files.

---

## Platform Compatibility Matrix

| Tool / Feature | Claude Code | Copilot (VS Code) | Cursor | Gemini CLI |
|----------------|------------|-------------------|--------|------------|
| `Read`, `Write`, `Edit`, `Glob`, `Grep` | ✓ | ✓ | ✓ | ✓ |
| `Bash` (shell commands) | ✓ | ✓ | ✓ | ✓ |
| `Task()` subagents | ✓ | Sequential fallback | ✓ | ✓ |
| `AskUserQuestion` | ✓ | Use `vscode_askquestions` | ✓ | ✓ |
| `vscode_askquestions` | ✗ | ✓ | ✗ | ✗ |
| `TodoWrite` / `TodoRead` | ✓ | ✓ | ✓ | ✗ |
| `WebFetch` | ✓ | ✓ (limited) | ✓ | ✓ |
| `~/.copilot/` paths | ✓ | ✓ | ✓ | ✓ |
| `~/.claude/` paths | ✗ | ✗ | ✗ | ✗ |
| `allowed-tools:` field | ✓ | ✓ | ✓ | ✓ |
| `tools:` field | ✗ | ✗ | ✗ | ✗ |
| `skills:` field | ✗ | ✗ | ✗ | ✗ BREAKS |
| `cat << 'EOF'` heredoc | ✓ (bash) | ✗ PowerShell | ✗ | varies |
| `mcp__*` tools | ✓ | ✓ (if configured) | varies | ✗ |

**Runtime note pattern for Copilot compatibility:**
```xml
<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`.
They are equivalent — `vscode_askquestions` is the VS Code Copilot implementation of the same
interactive question API. Do not skip questioning steps because `AskUserQuestion` appears
unavailable; use `vscode_askquestions` instead.
</runtime_note>
```

---

## Anti-Patterns

| Anti-pattern | Why it fails | Correct alternative |
|-------------|-------------|---------------------|
| `~/.claude/` in any path | Platform-specific; breaks on Copilot, Cursor, Gemini CLI | Use `~/.copilot/` for all GSD paths |
| `tools:` instead of `allowed-tools:` | `tools:` is the agent frontmatter field; skill format requires `allowed-tools:` — skill loader silently ignores or breaks | Use `allowed-tools:` always |
| `skills:` in frontmatter | Breaks Gemini CLI parsing; no valid skill loader reads this field | Remove entirely; use `allowed-tools:` |
| `cat << 'EOF'` heredoc in file-write instructions | Fails in PowerShell (Copilot default shell on Windows) and some zsh variants | Use `Write` tool directly, or a Python `with open()` one-liner |
| Hardcoded absolute home path (`/Users/akriz/`) | Non-portable across machines and users | Use `~` prefix or `os.homedir()` / `$HOME` at runtime |
| Vague process verbs ("handle", "manage", "deal with") | AI cannot determine what action to take or what tool to use | Use specific verb + target + tool: "Read X using Read tool, then Write Y using Write tool" |
| No completion marker or named output | Caller cannot detect when skill has finished; workflow routing breaks | Define a `## DONE` output block, a named file artifact, or a specific exit condition |
| Missing `<runtime_note>` for `AskUserQuestion` | Copilot users get a tool-not-found error and the skill silently skips the question | Add `<runtime_note>` with `vscode_askquestions` fallback for any skill that calls `AskUserQuestion` |

---

## Worked Example: gsd-plan-phase

**Full SKILL.md** with annotations explaining each section choice:

```markdown
---
name: gsd-plan-phase
description: Create detailed phase plan (PLAN.md) with verification loop
argument-hint: "[phase] [--auto] [--research] [--skip-research] [--gaps] [--skip-verify] [--prd <file>] [--reviews] [--text] [--tdd]"
agent: gsd-planner
allowed-tools: Read, Write, Bash, Glob, Grep, Task, AskUserQuestion, WebFetch, mcp__context7__*
---

<objective>
Create executable phase prompts (PLAN.md files) for a roadmap phase with integrated research and verification.

**Default flow:** Research (if needed) → Plan → Verify → Done

**Orchestrator role:** Parse arguments, validate phase, research domain (unless skipped), spawn gsd-planner, verify with gsd-plan-checker, iterate until pass or max iterations, present results.
</objective>

<execution_context>
@~/.copilot/get-shit-done/workflows/plan-phase.md
@~/.copilot/get-shit-done/references/ui-brand.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`.
They are equivalent — `vscode_askquestions` is the VS Code Copilot implementation of the same
interactive question API. Do not skip questioning steps because `AskUserQuestion` appears
unavailable; use `vscode_askquestions` instead.
</runtime_note>

<context>
Phase number: $ARGUMENTS (optional — auto-detects next unplanned phase if omitted)

**Flags:**
- `--research` — Force re-research even if RESEARCH.md exists
- `--skip-research` — Skip research, go straight to planning
- `--gaps` — Gap closure mode (reads VERIFICATION.md, skips research)
- `--skip-verify` — Skip verification loop
- `--prd <file>` — Use a PRD/acceptance criteria file instead of discuss-phase
- `--reviews` — Replan incorporating cross-AI review feedback from REVIEWS.md
- `--text` — Use plain-text numbered lists instead of TUI menus

Normalize phase input in step 2 before any directory lookups.
</context>

<process>
Execute the plan-phase workflow from @~/.copilot/get-shit-done/workflows/plan-phase.md end-to-end.
Preserve all workflow gates (validation, research, planning, verification loop, routing).
</process>
```

**Annotations:**

| Section | What it demonstrates |
|---------|---------------------|
| `name:` | Matches directory name exactly: `gsd-plan-phase` |
| `description:` | Imperative verb ("Create"), specific output ("PLAN.md"), key characteristic ("with verification loop") |
| `argument-hint:` | Documents all flags in `<required> [optional]` format; aids discoverability |
| `agent: gsd-planner` | Present because this skill orchestrates a specific named agent. Omit if the skill runs directly. |
| `allowed-tools:` | Covers everything the workflow needs: file ops (Read, Write, Bash, Glob, Grep), subagent spawning (Task), user interaction (AskUserQuestion), web research (WebFetch), and optional MCP tools (`mcp__context7__*`) |
| `<objective>` | States what it creates, the default flow, and the orchestrator role — no ambiguity about what success looks like |
| `<execution_context>` | Two `@~/.copilot/` paths — the workflow file (all logic lives here) and a shared reference. Loads on invocation. |
| `<runtime_note>` | Maps `AskUserQuestion` to `vscode_askquestions` for Copilot. Every skill that calls `AskUserQuestion` needs this. |
| `<context>` | Documents `$ARGUMENTS` format and all flags. Makes the skill self-documenting for both humans and future scaffolders. |
| `<process>` | Single delegation line — the workflow file contains the full logic. Keeps the SKILL.md lean. |

---

## Worked Example: gsd-execute-phase (abbreviated)

Key differences from `gsd-plan-phase` that illustrate optional field usage:

```markdown
---
name: gsd-execute-phase
description: Execute all plans in a phase with wave-based parallelization
argument-hint: "<phase-number> [--wave N] [--gaps-only] [--interactive] [--tdd]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, TodoWrite, AskUserQuestion
---
```

**Differences from gsd-plan-phase:**
- No `agent:` field — this skill orchestrates directly, not through a named agent
- Adds `Edit` and `TodoWrite` — execution tasks need in-place editing and todo tracking
- No `WebFetch` or `mcp__*` — execution doesn't do research
- `<phase-number>` is `<required>` (angle brackets) vs `[phase]` optional in plan-phase

Same `<execution_context>` and `<runtime_note>` pattern applies. The `<context>` section here documents flag handling rules in detail — important when flags must be explicitly activated (not implied by documentation).
