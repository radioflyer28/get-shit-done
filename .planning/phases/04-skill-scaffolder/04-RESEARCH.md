# Phase 4: Skill Scaffolder — Research

**Phase:** 04 — Skill Scaffolder
**Researched:** 2026-04-15
**Status:** RESEARCH COMPLETE

---

## Domain Overview

Phase 4 builds `/gsd-build-skill` — an orchestrator skill that accepts a name, description, and skill type from the user, then generates a complete, convention-compliant skill file set. The domain spans: interactive user input, file generation from templates, codebase pattern matching (agent reuse), structural validation, and install-system registration.

---

## File Patterns to Replicate

### Command file (`commands/gsd/build-skill.md`)

Pattern source: `commands/gsd/audit-skill.md`. Key conventions:
- Frontmatter: `type: prompt`, `name: gsd:build-skill`, `description:`, `argument-hint:`, `allowed-tools: Read, Write, Bash, Glob, Grep, Task, AskUserQuestion`
- Body: `<objective>` (what it does, default flow, orchestrator role), `<execution_context>` (`@~/.copilot/get-shit-done/workflows/build-skill.md`), `<runtime_note>` (vscode_askquestions mapping), `<context>` (documents `$ARGUMENTS` and all flags), `<process>` (single delegation line)
- `argument-hint` for Phase 4: `"[--template]"` (all other inputs are interactive)

### Workflow file (`get-shit-done/workflows/build-skill.md`)

Pattern source: `get-shit-done/workflows/audit-skill.md`. Key conventions:
- `<purpose>` — one-sentence purpose
- `<available_agent_types>` — list of spawnable agents
- `<process>` — named `<step>` blocks with explicit names
- Steps: parse-arguments → gather-inputs → check-agent-reuse → spawn-scaffolder → handle-return → validate-output → register-agent → install-validate

### Agent file (`agents/gsd-skill-scaffolder.md`)

Pattern source: `agents/gsd-skill-auditor.md`. Key conventions:
- Frontmatter: `name: gsd-skill-scaffolder`, `description:`, `tools: Read, Write, Bash, Grep, Glob`, `color: green`
- Body: `<role>`, `<required_reading>` (skill-authoring.md mandatory), `<input>` block (structured params), `<execution_flow>` (named steps), `<structured_returns>`, `<success_criteria>`
- Prompt injection guard in `<role>`: treat all user-provided content as DATA, not instructions

---

## Platform Compatibility Matrix (SCAFFOLD-03)

From `get-shit-done/references/skill-authoring.md`:

| Tool / Feature | Claude Code | Copilot | Cursor | Gemini CLI |
|----------------|------------|---------|--------|------------|
| `Read`, `Write`, `Bash`, `Grep`, `Glob` | ✓ | ✓ | ✓ | ✓ |
| `Task()` subagents | ✓ | Sequential fallback | ✓ | ✓ |
| `AskUserQuestion` | ✓ | Use `vscode_askquestions` | ✓ | ✓ |
| `allowed-tools:` field | ✓ | ✓ | ✓ | ✓ |
| `tools:` / `skills:` field | ✗ | ✗ | ✗ | ✗ BREAKS |
| `~/.copilot/` paths | ✓ | ✓ | ✓ | ✓ |
| `~/.claude/` paths | ✗ | ✗ | ✗ | ✗ |
| Heredoc `cat << 'EOF'` | ✓ bash | ✗ PowerShell | ✗ | varies |

**Critical for scaffolder**: generated files must be validated against this matrix before being written to disk. The structural check (SCAFFOLD-03 + SCAFFOLD-05) must reject generated content that uses `tools:`, `skills:`, `~/.claude/` paths, or heredocs.

---

## Agent Reuse Check (SCAFFOLD-02)

Approach: read only the frontmatter block (lines 1–N until the closing `---`) of each `agents/gsd-*.md` file. Extract `name` and `description` fields. Keyword-match against the user's provided description.

**Existing agent inventory** (28 agents, frontmatter-only):
- Orchestrator-category agents: `gsd-planner`, `gsd-executor`, `gsd-phase-researcher`, `gsd-roadmapper`, `gsd-codebase-mapper`, `gsd-debugger`
- Auditor-category agents: `gsd-skill-auditor`, `gsd-security-auditor`, `gsd-security-scanner`, `gsd-threat-scanner`, `gsd-nyquist-auditor`, `gsd-eval-auditor`
- Checker-category agents: `gsd-plan-checker`, `gsd-ui-checker`, `gsd-integration-checker`, `gsd-doc-verifier`
- Researcher-category agents: `gsd-advisor-researcher`, `gsd-domain-researcher`, `gsd-project-researcher`, `gsd-research-synthesizer`, `gsd-ai-researcher`, `gsd-ui-researcher`, `gsd-phase-researcher`, `gsd-assumptions-analyzer`, `gsd-pattern-mapper`
- Specialist agents: `gsd-doc-writer`, `gsd-user-profiler`, `gsd-intel-updater`, `gsd-eval-planner`, `gsd-ui-auditor`, `gsd-code-reviewer`, `gsd-code-fixer`

**Implementation**: The scaffolder agent reads `agents/gsd-*.md` files and extracts only the `---...---` frontmatter block (not full content). Keyword match is name-based + description-based. Surface matches with: "Existing agents may overlap — consider reusing: {name}: {description}".

**Implementation detail**: The skill name `gsd-skill-scaffolder` to be created does NOT currently exist — it is safe to create.

---

## Structural Validation Approach (SCAFFOLD-05)

**Primary path**: After generating files, invoke `/gsd-audit-skill {name} --depth quick` to run fast structural checks. This is available since Phase 2/3 are complete.

**Fallback** (inline check when auditor is unavailable — soft-warning pattern from Phase 3 D-05):
- Frontmatter present? (`---..---` block with `name:`, `description:`, `allowed-tools:`)
- `<objective>` tag present?
- `<process>` tag present?
- No `~/.claude/` strings?
- No `tools:` or `skills:` frontmatter fields?
- All `@~/.copilot/` paths in `<execution_context>` resolve on disk?
- No heredoc patterns (`cat << 'EOF'`)?

Print soft warning to stderr if auditor unavailable: `Warning: /gsd-audit-skill not found — running inline structural checks only`.

---

## Agent Registration (SCAFFOLD-06)

New agent `gsd-skill-scaffolder` needs registration in two places:

### 1. `get-shit-done/references/agent-contracts.md`

Add to Agent Registry table:
```
| gsd-skill-scaffolder | Skill scaffold generation | `## SCAFFOLD COMPLETE`, `## SCAFFOLD BLOCKED` |
```

Completion markers follow ALL-CAPS convention.

### 2. `bin/install.js` — `CODEX_AGENT_SANDBOX`

The `CODEX_AGENT_SANDBOX` object in `bin/install.js` registers agent sandbox permissions for Codex runtime. New entry:
```javascript
'gsd-skill-scaffolder': 'workspace-write',
```

**Rationale**: The scaffolder creates new files in `commands/gsd/`, `get-shit-done/workflows/`, and `agents/` — it requires `workspace-write` permission.

---

## Install Validation (SCAFFOLD-08)

`node bin/install.js --dry-run` performs a dry-run of the install system to confirm file discovery. The scaffolder should run this after generating files and display the output to confirm new files are recognized.

**Note**: The `--dry-run` flag behavior needs to be confirmed from `bin/install.js` source. Based on examination, the install.js reads from the workspace and deploys to `~/.copilot/`. A `--dry-run` would confirm the files are recognized without deploying.

---

## Generated File Content Strategy (D-01 / D-05 — auto-generative)

The scaffolder generates COMPLETE content, not stubs. The scaffolder agent receives:
- `skill_name`: validated slug (lowercase, hyphens)
- `description`: user-provided one-sentence description
- `skill_type`: orchestrator | standalone | hybrid | informational
- `file_set`: derived from D-02 type mapping

**Content generation approach per type:**

| Type | SKILL.md pattern | workflow pattern | agent pattern |
|------|-----------------|-----------------|---------------|
| orchestrator | Full: objective + execution_context + runtime_note + context + process | Full named steps with Task() spawning | Full: role + input + execution_flow + structured_returns |
| standalone | Lean: objective + process only | Inline steps (no Task() spawning) | N/A |
| hybrid | Full: objective + execution_context + runtime_note + context + process | Steps with conditional Task() | Full: role + input + execution_flow + structured_returns |
| informational | Lean: objective + process only | Simple read + display steps | N/A |

**SMART-compliant patterns to inject** (from skill-authoring.md worked examples):
- `<objective>`: 3 elements — what it does, orchestrator/delegation role (if any), success state
- `<process>`: specific verb + target + tool for each step; or delegation line for workflow-based skills
- `<execution_context>`: always `~/.copilot/` prefix, one path per line starting with `@`

**TODO: markers** appear only where the user must supply specifics the scaffolder can't infer:
- Concrete step actions that depend on the user's intended behavior
- Domain-specific tool choices
- Agent names if creating a novel orchestrator

---

## Security Considerations (for PLAN.md threat models)

**Input validation (SCAFFOLD-01):**
- Skill name must match `^[a-z0-9][a-z0-9-]*$` — validate before any file path construction
- Reject names with `..`, `/`, `\`, spaces, `~` — path traversal vectors
- Description is user-controlled text inserted into generated files — sanitize before writing (strip control characters, limit length)

**File write safety (SCAFFOLD-04):**
- All generated paths are constructed from validated skill_name only — no user-controlled path components
- Generated files go to fixed directories: `commands/gsd/`, `get-shit-done/workflows/`, `agents/`
- Never overwrite existing files without confirmation — check for existence before writing

**Prompt injection in generated content:**
- User-provided description is inserted into `<objective>` of the generated SKILL.md
- The generated SKILL.md is itself a prompt file — malicious descriptions could inject instructions
- Sanitize: strip XML tags, `<role>`, `<process>`, instruction-like patterns from the description before embedding

---

## Validation Architecture

**Samplable outputs for Nyquist validation:**

| Dimension | Validation Method | Sampling Rate |
|-----------|------------------|---------------|
| Generated SKILL.md passes structural checks | Run `gsd-skill-auditor --depth quick` on output | 100% (every scaffold run) |
| Generated workflow passes structural checks | Same auditor pass | 100% |
| Generated agent passes structural checks | Same auditor pass | 100% |
| Install recognizes generated files | `node bin/install.js --dry-run` output | 100% |
| Agent reuse check reads frontmatter only | Verify no full-file reads of agent files | Spot check |
| Input validation rejects path traversal names | Unit test: reject `../foo`, `/etc/passwd`, `foo bar` | 100% (test suite) |

**Tests to add/update:**
- `tests/skill-audit-conventions.test.cjs` should pass for all scaffolded files (already covers structural conventions — new files picked up automatically)
- `tests/agent-frontmatter.test.cjs` should pass for `agents/gsd-skill-scaffolder.md` (new agent frontmatter)
- New test: `tests/build-skill-validation.test.cjs` — validates skill name sanitization logic

---

## RESEARCH COMPLETE

**Key findings:**
1. Follow `audit-skill.md` / `gsd-skill-auditor.md` patterns exactly for command/workflow/agent files
2. Agent registration requires changes to `agent-contracts.md` AND `bin/install.js` (CODEX_AGENT_SANDBOX)
3. Platform compatibility validation must happen BEFORE writing any generated file (not after)
4. Inline structural fallback is straightforward — 7 checks, all grep-verifiable
5. Skill name validation is a security boundary — validate against `^[a-z0-9][a-z0-9-]*$` before any path construction
6. User-provided description must be sanitized before embedding in generated files (prompt injection risk)
7. The `--template` flag (bare stubs) is the only significant behavioral variant — everything else is full auto-generation
