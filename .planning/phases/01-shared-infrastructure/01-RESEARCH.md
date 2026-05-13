# Phase 1: Shared Infrastructure — Research

**Written:** 2026-04-15
**Researcher:** gsd-phase-researcher
**Phase:** 01-shared-infrastructure

---

## Standard Stack

Everything in this phase builds on Node.js built-ins and existing repo patterns. No new dependencies required.

| Asset | Location | Use |
|-------|----------|-----|
| `node:test` + `node:assert/strict` | Node 22+ built-in | Test framework for `skill-audit-conventions.test.cjs` |
| `scripts/run-tests.cjs` | `scripts/run-tests.cjs` | Auto-globs `tests/*.test.cjs`, runs with `--test-concurrency=4` |
| `tests/helpers.cjs` | `tests/helpers.cjs` | `createTempProject`, `cleanup`, `runGsdTools` — available but unlikely needed here (skills are read-only glob checks) |
| `get-shit-done/references/` | flat dir | All reference files live here; skill-smart-criteria.md and skill-authoring.md go here |
| Installed skills | `~/.copilot/skills/*/SKILL.md` | 75 skills; all are `SKILL.md` only (no other files in skill dirs) |

**Skill directory structure (confirmed):** Every installed skill is a single directory containing exactly one file: `SKILL.md`. No exceptions found across 75 skills.

**npm test:** `node scripts/run-tests.cjs` → globs all `tests/*.test.cjs` → `node --test --test-concurrency=4`. New test file is picked up automatically.

---

## Architecture Patterns

### Deliverable 1: `get-shit-done/references/skill-smart-criteria.md`

Model on `get-shit-done/references/agent-contracts.md`:
- H1 title + purpose statement
- H2 sections with structured tables
- Machine-readable: terse, checkable conditions (not prose)
- Leave explicit `<!-- Phase 2: good/bad examples go here -->` placeholders per dimension
- Each dimension: name, definition, sub-criteria table (criterion | 1 | 3 | 5), placeholder for examples

**Structure:**
```
# Skill SMART Criteria
## Purpose
## How to Use This Rubric
## Dimensions
### S — Specific
### M — Measurable
### A — Achievable
### R — Relevant
### T — Time-bound
## Scoring Summary Table
## Notes for Phase 2
```

### Deliverable 2: `tests/skill-audit-conventions.test.cjs`

Direct pattern clone of `tests/agent-frontmatter.test.cjs`:
- `'use strict';` at top
- `require('node:test')`, `require('node:assert/strict')`, `require('fs')`, `require('path')`
- `SKILLS_DIR = path.join(__dirname, '..', ...)` — but skills live in `~/.copilot/skills/`, not in repo
- **Key design decision:** Skills are installed at `~/.copilot/skills/` (runtime path), not in the repo. Test must resolve this path.
  - Option A: `path.join(require('os').homedir(), '.copilot', 'skills')` — works cross-platform
  - Option B: env var override `SKILLS_DIR` for testability
  - **Recommend Option A with env var fallback:** `process.env.GSD_SKILLS_DIR || path.join(os.homedir(), '.copilot', 'skills')`
- Grandfathering: load `ALL_SKILLS`, split into `V1_SKILLS` (skills created in this milestone — initially empty array or read from a manifest) vs `LEGACY_SKILLS`. Violations in legacy skills → `console.warn`, not `assert.fail`.
  - Simplest implementation: hardcode v1 skill names in a `V1_SKILLS` constant at top of file. Initially `[]`. Phase 4 adds skills to it.
- Section dividers: `// ─── Section Name ────────────────────────────────────────────`

**Test describe blocks:**
1. `FRONTMATTER: required keys` — name, description, allowed-tools present in frontmatter
2. `STRUCTURE: required XML tags` — `<objective>` and `<process>` present
3. `STRUCTURE: execution_context paths` — if `<execution_context>` present, referenced `@~/.copilot/` paths are structurally valid (not necessarily resolvable, just correct format)
4. `ANTIPATTERN: no hardcoded ~/.claude/ paths` — regex `/~\/\.claude\//` must not appear
5. `ANTIPATTERN: no heredoc patterns` — regex `/cat\s+<<\s*'?EOF'?/` must not appear in non-comment lines
6. `ANTIPATTERN: no hardcoded absolute Windows/Unix home paths` — catch `/Users\/\w+\/` or `\/home\/\w+\/`

### Deliverable 3: `get-shit-done/references/skill-authoring.md`

Model on `agent-contracts.md` (structured tables, H2 sections). Decision D-08 specifies: reference with examples format — structured tables + platform compatibility matrix + anti-patterns list + worked examples.

**Sections:**
```
# Skill Authoring Guide
## Quick Start (D-10: agent decides — YES, include for navigability)
## File Structure
## Frontmatter Field Reference
## Required Body Sections
## Optional Body Sections
## Platform Compatibility Matrix
## Anti-Patterns
## Worked Example: gsd-plan-phase
## Worked Example: gsd-execute-phase (abbreviated)
```

---

## Don't Hand Roll

| Don't build | Use instead |
|-------------|-------------|
| Custom test runner | `scripts/run-tests.cjs` auto-discovers `tests/*.test.cjs` |
| Test framework imports | `require('node:test')` + `require('node:assert/strict')` exactly |
| Path resolution for REPO_ROOT | `const REPO_ROOT = path.join(__dirname, '..')` — established pattern |
| External YAML parser for frontmatter | Use `content.split('---')[1]` string extraction — same as `agent-frontmatter.test.cjs` |
| Complex glob library | `fs.readdirSync` + filter — used throughout existing tests |
| Cross-platform home dir | `require('os').homedir()` — do not hardcode `/Users/` or `~` |

---

## Common Pitfalls

### Test file pitfalls
1. **Skills live outside the repo.** Unlike agents (`agents/gsd-*.md` inside repo), skills are at `~/.copilot/skills/`. The test must use `os.homedir()` to resolve the path, not `__dirname`. Failure mode: test passes in CI (no skills installed) but never catches real violations.
2. **Frontmatter extraction.** Skills use `---` delimiters like agents. Use `content.split('---')[1]` to extract frontmatter. Watch for SKILL.md files that have no frontmatter — guard with `|| ''`.
3. **`allowed-tools` vs `tools`.** Agent files use `tools:`. Skill files use `allowed-tools:`. The test must check for `allowed-tools:`, not `tools:`. Confirmed in gsd-plan-phase, gsd-execute-phase, gsd-add-backlog, gsd-discuss-phase, gsd-autonomous.
4. **Grandfathering logic.** If `V1_SKILLS` is empty at Phase 1 delivery, all checks are effectively warnings. This is correct — Phase 4 populates it. Do NOT skip the grandfathering structure; adding it later requires touching the test again.
5. **`<execution_context>` is optional.** gsd-add-backlog has no `<execution_context>`. The check must be conditional: `if (content.includes('<execution_context>'))`.
6. **Heredoc false positives.** The anti-heredoc instruction text itself contains the heredoc pattern string. Skip lines containing `never use` or `NEVER` — same pattern as `agent-frontmatter.test.cjs`.

### Reference file pitfalls
7. **Rubric must be AI-readable.** Per the specifics in CONTEXT.md: "written to be read by an AI agent, not just a human — terse, unambiguous, with each sub-criterion stated as a checkable condition." Avoid flowing prose for sub-criteria; use imperative checklist form.
8. **Phase 2 placeholders must be explicit.** The auditor agent reads the rubric and expects good/bad example sections. Add clearly marked placeholder comments/sections so Phase 2 knows exactly where to inject examples.
9. **`skill-authoring.md` is machine-consumed.** Phase 4 scaffolder reads it as context. Keep sections clearly delimited by H2 headings with consistent naming. Avoid burying key facts in paragraphs.

---

## SMART Rubric Design

GSD adaptation of SMART: the 5 dimensions map directly to prompt quality for AI skills.

### S — Specific
**Definition:** The skill's objective and steps specify *what*, *how*, and *under what conditions* — no ambiguous verbs.

| Sub-criterion | 1 (Absent) | 3 (Partial) | 5 (Full) |
|--------------|-----------|-------------|---------|
| **Objective clarity** | Objective is a vague goal ("help with X") | Objective states output but not conditions | Objective states exact output, trigger conditions, and success state |
| **Step specificity** | Steps use open-ended verbs ("handle", "manage", "deal with") | Steps name the action but not the target or tool | Steps name action, target file/resource, and tool to use |
| **Scope boundary** | No indication of what is out of scope | Partial scope (happy path only) | Explicit scope boundaries: what the skill does AND does not do |
| **Argument handling** | `$ARGUMENTS` used but never parsed or explained | Arguments partially documented in context | All accepted arguments documented with semantics and defaults |

<!-- Phase 2: add good/bad examples from real skill audits here -->

### M — Measurable
**Definition:** Completion is detectable without human judgment — observable outputs, file changes, or terminal markers.

| Sub-criterion | 1 (Absent) | 3 (Partial) | 5 (Full) |
|--------------|-----------|-------------|---------|
| **Completion signal** | No output or marker defined | Output described loosely ("report results") | Exact completion marker or output format specified (e.g., `## DONE`, file written) |
| **Observable outputs** | No files, artifacts, or state changes listed | Some outputs mentioned but not all | All created/modified files/artifacts enumerated |
| **Verification steps** | No way to check success | Check is subjective ("looks right") | Concrete check: file exists, content matches pattern, command returns 0 |
| **Failure signal** | Silent failure possible | Error mentioned but not how to detect | Failure path has explicit signal or message format |

<!-- Phase 2: add good/bad examples from real skill audits here -->

### A — Achievable
**Definition:** Every tool used is permitted by `allowed-tools`; every referenced file/path actually exists at runtime; no steps require capabilities beyond the AI platform.

| Sub-criterion | 1 (Absent) | 3 (Partial) | 5 (Full) |
|--------------|-----------|-------------|---------|
| **Tool permission alignment** | Steps call tools not in `allowed-tools` | All tools listed but some not used (over-declared) | `allowed-tools` matches exactly what the skill uses |
| **Path existence** | `<execution_context>` paths reference non-existent files | Paths exist but use hardcoded user-specific paths | Paths use runtime-appropriate `~/.copilot/` pattern and resolve correctly |
| **Platform feasibility** | Steps require platform-specific behavior without runtime note | Platform differences noted but no fallback | `<runtime_note>` provides fallback for each platform-incompatible step |
| **Scope realism** | Steps require sub-agent spawning but `Task` not in `allowed-tools` | Task in tools but spawn pattern is incomplete | Agent spawn pattern complete: tool listed, agent named, output handling specified |

<!-- Phase 2: add good/bad examples from real skill audits here -->

### R — Relevant
**Definition:** Every step and section serves the stated objective — no dead weight, no scope creep, no context that belongs elsewhere.

| Sub-criterion | 1 (Absent) | 3 (Partial) | 5 (Full) |
|--------------|-----------|-------------|---------|
| **Objective coherence** | Steps don't map to the stated objective | Most steps serve objective; 1-2 are tangential | Every step has a traceable line to the objective |
| **Context relevance** | `<context>` section contains info not used by any step | Most context used; some noise | All context in `<context>` is consumed by at least one step |
| **Execution context fit** | `<execution_context>` loads files irrelevant to skill function | Relevant files loaded plus 1-2 extras | Exactly the files needed — no more, no less |
| **No scope bleed** | Skill does work belonging to a different skill/agent | Minor overlap with adjacent skill | Clean boundary: skill delegates out-of-scope work rather than implementing it |

<!-- Phase 2: add good/bad examples from real skill audits here -->

### T — Time-bound
**Definition:** The skill has defined execution bounds — steps are finite, loops have exit conditions, and the skill terminates without external intervention under normal conditions.

| Sub-criterion | 1 (Absent) | 3 (Partial) | 5 (Full) |
|--------------|-----------|-------------|---------|
| **Step count bounds** | Process has unbounded iteration ("keep trying until done") | Bounded iteration mentioned but not enforced | Explicit max iterations or termination condition per loop |
| **Blocking gate handling** | Skill can hang waiting for user input without timeout | User gate present but no "if no response" path | All `AskUserQuestion` gates have a documented default or timeout path |
| **Phase scope** | Skill could expand indefinitely based on what it finds | Scope creep possible but unlikely | Skill stops at phase boundary regardless of remaining work discovered |
| **Checkpoint clarity** | No indication of when to pause vs proceed | Pause points mentioned but trigger unclear | Each checkpoint has explicit trigger condition and resume instruction |

<!-- Phase 2: add good/bad examples from real skill audits here -->

---

## Convention Test Design

### File discovery
```javascript
const SKILLS_DIR = process.env.GSD_SKILLS_DIR
  || path.join(require('os').homedir(), '.copilot', 'skills');

const ALL_SKILLS = fs.existsSync(SKILLS_DIR)
  ? fs.readdirSync(SKILLS_DIR).filter(d =>
      fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()
      && fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md'))
    )
  : [];

// v1 skills created in this milestone — empty until Phase 4 adds skills
const V1_SKILLS = [];
const LEGACY_SKILLS = ALL_SKILLS.filter(s => !V1_SKILLS.includes(s));
```

### Grandfathering mechanism
```javascript
function checkSkill(skillName, checkFn, message) {
  const isV1 = V1_SKILLS.includes(skillName);
  try {
    checkFn();
  } catch (err) {
    if (isV1) throw err;  // v1 skills must pass
    console.warn(`[LEGACY] ${skillName}: ${message}`);  // legacy: warn only
  }
}
```

### Structural checks needed (from D-05)

| Check | Detection method | Applies to |
|-------|-----------------|------------|
| `name:` in frontmatter | `frontmatter.includes('name:')` | All skills |
| `description:` in frontmatter | `frontmatter.includes('description:')` | All skills |
| `allowed-tools:` in frontmatter | `frontmatter.includes('allowed-tools:')` | All skills |
| `<objective>` tag present | `content.includes('<objective>')` | All skills |
| `<process>` tag present | `content.includes('<process>')` | All skills |
| `<execution_context>` path format | If present: paths use `@~/.copilot/` pattern, not `@~/.claude/` | Skills with `<execution_context>` |
| No `~/.claude/` paths | `/~\/\.claude\//.test(content)` | All skills |
| No heredoc patterns | `/cat\s+<<\s*'?EOF'?/.test(line)` on non-comment lines | All skills |

### Anti-pattern regex patterns (from anti-pattern-enforcement.test.cjs model)
```javascript
// Hardcoded Claude path (wrong platform)
const HARDCODED_CLAUDE_PATH = /~\/\.claude\//;

// Heredoc pattern (must skip lines with 'never use' / 'NEVER')
const HEREDOC_PATTERN = /cat\s+<<\s*'?EOF'?/;

// Hardcoded home path (non-portable)
const HARDCODED_HOME = /\/Users\/[^/]+\/|\/home\/[^/]+\//;
```

### Section structure for test file
```
// ─── Frontmatter: Required Keys ──────────────────────────────────────────────
describe('FRONTMATTER: required keys', () => { ... })

// ─── Structure: Required XML Tags ────────────────────────────────────────────
describe('STRUCTURE: required XML tags', () => { ... })

// ─── Structure: Execution Context ────────────────────────────────────────────
describe('STRUCTURE: execution_context format', () => { ... })

// ─── Anti-pattern: Hardcoded Paths ───────────────────────────────────────────
describe('ANTIPATTERN: no hardcoded ~/.claude/ paths', () => { ... })

// ─── Anti-pattern: Heredoc ───────────────────────────────────────────────────
describe('ANTIPATTERN: no heredoc patterns', () => { ... })
```

---

## Authoring Guide Structure

Based on `agent-contracts.md` format and D-08/D-09/D-10 decisions:

### Recommended sections

**Quick Start** (D-10 — include, aids navigability for Phase 4 scaffolder):
- Minimum viable SKILL.md template
- 3 steps to create a new skill

**File Structure table:**
| File | Required | Description |
|------|----------|-------------|
| `SKILL.md` | Yes | The entire skill — frontmatter + body |

(All skills are single-file. Confirmed from 75 installed skills.)

**Frontmatter Field Reference:**

| Field | Required | Format | Example |
|-------|----------|--------|---------|
| `name` | Yes | `gsd-{kebab-name}` | `gsd-plan-phase` |
| `description` | Yes | One sentence, imperative | `Create detailed phase plan...` |
| `argument-hint` | Optional | `<required> [optional]` format | `"[phase] [--auto]"` |
| `allowed-tools` | Yes | Comma-separated tool names | `Read, Write, Bash, Task` |
| `agent` | Optional | `gsd-{agent-name}` if skill delegates to a specific agent | `gsd-planner` |

Note: `skills:` MUST NOT appear — breaks Gemini CLI. `tools:` is the agent format; skill format is `allowed-tools:`.

**Required Body Sections:**
- `<objective>` — What the skill does and what it produces. No ambiguity.
- `<process>` — Ordered steps or workflow delegation instruction.

**Optional Body Sections:**
- `<execution_context>` — Files loaded via `@` references. Use `~/.copilot/` path, never `~/.claude/`.
- `<context>` — Runtime variables, flag documentation, parsed `$ARGUMENTS`.
- `<runtime_note>` — Platform-specific behavioral differences (Copilot vs Claude vs Cursor).

**Platform Compatibility Matrix:**

| Feature | Claude Code | Copilot (VS Code) | Cursor | Gemini CLI |
|---------|------------|-------------------|--------|------------|
| `AskUserQuestion` | ✓ | Use `vscode_askquestions` | ✓ | ✓ |
| `Task()` subagents | ✓ | Sequential fallback | ✓ | ✓ |
| `~/.copilot/` paths | ✓ | ✓ | ✓ | ✓ |
| `~/.claude/` paths | ✗ | ✗ | ✗ | ✗ |
| `allowed-tools` field | ✓ | ✓ | ✓ | ✓ |
| `skills:` field | ✗ breaks | ✗ | ✗ | ✗ BREAKS |

**Anti-Patterns table:**

| Anti-pattern | Why it fails | Fix |
|-------------|-------------|-----|
| `~/.claude/` in any path | Platform-specific; breaks on Copilot/Cursor | Use `~/.copilot/` |
| `cat << 'EOF'` heredoc | Fails in non-bash shells (PowerShell, zsh variants) | Use `Write` tool or Python one-liner |
| Hardcoded `/Users/akriz/` | Non-portable | Use `~` or runtime path resolution |
| `skills:` in frontmatter | Breaks Gemini CLI parsing | Remove entirely |
| `tools:` instead of `allowed-tools:` | Wrong field name for skills | Use `allowed-tools:` |
| Unbounded loops | Skill never terminates | Add explicit max iterations |
| Mixed decision + execution in one step | Reduces step predictability | Split into separate steps |

**Worked Example: gsd-plan-phase** — annotated SKILL.md with callouts per section.

**Worked Example: gsd-execute-phase** — abbreviated, highlighting differences (no `agent:` field, more complex flag handling).

---

## Validation Architecture

### How to verify the 3 deliverables are correct after implementation:

**skill-smart-criteria.md:**
- [ ] File exists at `get-shit-done/references/skill-smart-criteria.md`
- [ ] Contains exactly 5 H3 sections (one per SMART dimension)
- [ ] Each dimension has a sub-criteria table with 1/3/5 columns
- [ ] Each dimension has a `<!-- Phase 2: ... -->` placeholder comment
- [ ] File is parseable as markdown (no broken tables)
- [ ] No prose sub-criteria — all conditions are checkable imperatives

**skill-audit-conventions.test.cjs:**
- [ ] `npm test` runs without error (all tests pass or LEGACY warns)
- [ ] File is in `tests/` and named `skill-audit-conventions.test.cjs`
- [ ] Uses `'use strict'`, `node:test`, `node:assert/strict` — no external deps
- [ ] Covers all 5 structural checks from D-05
- [ ] Covers both anti-patterns (hardcoded paths + heredoc)
- [ ] Grandfathering: legacy skill violations emit `console.warn`, not `assert.fail`
- [ ] V1_SKILLS constant is present and empty (ready for Phase 4)
- [ ] `GSD_SKILLS_DIR` env var overrides default path (for testability)

**skill-authoring.md:**
- [ ] File exists at `get-shit-done/references/skill-authoring.md`
- [ ] Contains Quick Start section
- [ ] Contains Frontmatter Field Reference table with all 5 fields
- [ ] Contains Platform Compatibility Matrix
- [ ] Contains Anti-Patterns table
- [ ] Contains at least one annotated worked example (gsd-plan-phase)
- [ ] All `allowed-tools` vs `tools:` distinction is clearly documented
- [ ] No information contradicts what's in SKILL.md exemplars

---

*Phase: 01-shared-infrastructure*
*Research completed: 2026-04-15*
