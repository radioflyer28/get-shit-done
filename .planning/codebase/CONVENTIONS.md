# Code Conventions

**Analysis Date:** 2026-04-14

## Language & Style

**Primary Language:** JavaScript — CommonJS (`.cjs`) modules only. `require()` everywhere; no ESM `import`.

**Style Rules (from CONTRIBUTING.md):**
- No external dependencies in core — `get-shit-done/bin/lib/*.cjs` and `get-shit-done/bin/gsd-tools.cjs` use only Node.js built-ins
- No linting config detected (no `.eslintrc`, no `biome.json`) — style is enforced via code review
- `'use strict';` at the top of `.cjs` files
- Section dividers use the pattern `// ─── Section Name ────────` (em-dash box style)
- JSDoc comments on exported functions with `@param` and `@returns` tags

**Formatting:**
- 2-space indentation
- Single quotes for strings in JS
- Trailing commas in multi-line arrays/objects

## Naming Conventions

**Files:**
- Test files: `kebab-case.test.cjs` (e.g., `agent-frontmatter.test.cjs`)
- Bug regression tests: `bug-{issueNumber}-{description}.test.cjs` (e.g., `bug-2075-worktree-deletion-safeguards.test.cjs`)
- Library modules: `kebab-case.cjs` (e.g., `security.cjs`, `core.cjs`, `model-profiles.cjs`)
- Agent files: `gsd-{name}.md` (e.g., `gsd-executor.md`)
- Command files: `kebab-case.md` (e.g., `execute-phase.md`, `analyze-dependencies.md`)
- Workflow files: `kebab-case.md` (e.g., `execute-phase.md`)

**JavaScript Functions:**
- `camelCase` for all functions and variables (e.g., `validatePath`, `createTempProject`, `toPosixPath`)
- `SCREAMING_SNAKE_CASE` for module-level constants (e.g., `TOOLS_PATH`, `AGENTS_DIR`, `REPO_ROOT`)
- `PascalCase` for constructors/classes (none detected in lib; not a primary pattern)

**Agent Names:** `gsd-{role}` — always prefixed with `gsd-` (e.g., `gsd-executor`, `gsd-planner`, `gsd-verifier`)

**Command Names:** `gsd:{command}` in frontmatter `name:` field (e.g., `gsd:execute-phase`)

## Agent Authoring Conventions

Agent files live in `agents/` and follow this structure:

```markdown
---
name: gsd-{role}
description: {One-line description of purpose and spawn context}
tools: Read, Write, Edit, Bash, Grep, Glob, mcp__context7__*
color: {yellow|blue|green|purple|red}
# hooks:
#   PostToolUse:
#     - matcher: "Write|Edit"
#       hooks:
#         - type: command
#           command: "..."
---

<role>
You are a GSD {role}. {Description of what it does and who spawns it.}
</role>
```

**Frontmatter rules:**
- `name:` — required, `gsd-{role}` format
- `description:` — required, one-line
- `tools:` — required; use comma-separated list
- `color:` — optional
- `skills:` — **MUST NOT be present** — breaks Gemini CLI
- `hooks:` — always commented out (never active in frontmatter)

**Body conventions:**
- File-writing agents MUST include the anti-heredoc instruction: `"never use \`Bash(cat << 'EOF')\` or heredoc"` 
- Use XML-like tags for structure: `<role>`, `<process>`, `<step>`, `<documentation_lookup>`, `<required_reading>`
- `<required_reading>` blocks list files the agent must load before acting
- Steps use `<step name="..." priority="...">` attributes

## Command Authoring Conventions

Command files live in `commands/gsd/` and follow this structure:

```markdown
---
name: gsd:{command-name}
description: {One-line description}
argument-hint: "<required-arg> [optional-arg] [--flag]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - TodoWrite
  - AskUserQuestion
---
<objective>
{What this command does.}
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/{workflow-name}.md
</execution_context>

<runtime_note>
{Runtime-specific overrides, e.g. Copilot vs Claude Code differences.}
</runtime_note>

<context>
Phase: $ARGUMENTS

**Available optional flags (documentation only — not automatically active):**
- --flag — description
</context>

<process>
...
</process>
```

**Key rules:**
- `$ARGUMENTS` is the variable for user-supplied arguments
- Flags documented under `<context>` are only active when literally present in `$ARGUMENTS`
- Always note Copilot vs Claude Code runtime differences in `<runtime_note>`
- Reference workflows via `@~/.claude/get-shit-done/workflows/{name}.md`

## Workflow Authoring Conventions

Workflow files live in `get-shit-done/workflows/` and use XML-tag structure:

```markdown
<purpose>
{One-paragraph summary of what this workflow does.}
</purpose>

<core_principle>
{The single guiding constraint.}
</core_principle>

<runtime_compatibility>
{Notes for different AI runtimes — Claude Code, Copilot, Gemini, Codex.}
</runtime_compatibility>

<required_reading>
Read STATE.md before any operation to load project context.

@~/.claude/get-shit-done/references/{reference-file}.md
</required_reading>

<process>

<step name="step_name" priority="first|...">
{Step instructions.}
</step>

</process>
```

**Conventions:**
- Always include `<runtime_compatibility>` when subagent spawning is involved
- `<required_reading>` lists `@~/.claude/get-shit-done/references/` files to preload
- Step names use `snake_case`
- `priority="first"` marks steps that must execute before any other

## Commit Conventions

Conventional commits format: `type: description`

| Type | When to use |
|------|-------------|
| `feat:` | New feature or command |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code change that isn't a bug fix or feature |
| `test:` | Adding or updating tests |
| `ci:` | CI/CD config changes |

**PR Linking:** PR body must include `Closes #NNN`, `Fixes #NNN`, or `Resolves #NNN`.

## Error Handling Patterns

**Structured returns from lib functions:**
```javascript
// Success
return { safe: true, resolved: '/abs/path/to/file' };

// Failure
return { safe: false, resolved: '', error: 'Descriptive error message' };
```

**CLI tool invocations:**
- `runGsdTools()` returns `{ success: true, output: '...' }` or `{ success: false, output: '', error: '...' }`
- Callers check `result.success` before using `result.output`

**Security rules:**
- Use `validatePath()` from `get-shit-done/bin/lib/security.cjs` for all user-provided paths
- Use `execFileSync(process.execPath, [script, ...argv])` — never `execSync` with string interpolation (prevents shell injection)
- Reject null bytes, path traversal (`../`), and absolute paths in user input unless explicitly allowed

**No `try/finally` in test bodies** — use `beforeEach`/`afterEach` or `t.after()` instead.
