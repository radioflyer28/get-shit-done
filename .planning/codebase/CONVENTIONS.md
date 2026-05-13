# Code Conventions

**Analysis Date:** 2026-05-13
**Mapped Commit:** `c582682e`

## Language Conventions

CommonJS is the default for root runtime code:
- Use `'use strict';` at the top of `.cjs` files.
- Use `require()` and `module.exports`.
- Prefer Node built-ins in `get-shit-done/bin/lib/*.cjs`.
- Keep CLI helpers cross-platform unless a script is explicitly shell-only.

TypeScript is isolated to the SDK:
- SDK code lives under `sdk/src/`.
- Use ESM-style `import`/`export` in SDK files.
- Build output goes to `sdk/dist/`.
- Shared model data lives in `sdk/shared/model-catalog.json`, not duplicated constants.

Markdown is the product surface:
- Agents live in `agents/*.md`.
- Commands live in `commands/gsd/*.md`.
- Workflows live in `get-shit-done/workflows/*.md`.
- References live in `get-shit-done/references/**/*.md`.
- Templates live in `get-shit-done/templates/*.md`.

## File Naming

Common patterns:
- Runtime libraries: `kebab-case.cjs` such as `runtime-homes.cjs`, `install-profiles.cjs`.
- Tests: `kebab-case.test.cjs` or `bug-{issue}-{description}.test.cjs`.
- SDK tests: colocated `*.test.ts` under `sdk/src/`.
- Agents: `gsd-{role}.md`.
- Commands/workflows: `kebab-case.md`.
- Security scripts: descriptive names such as `security_prescan.py`, `scan_baseline.py`, `scan_ci.sh`.

## JavaScript Style

Observed conventions:
- 2-space indentation.
- Single quotes for JS strings.
- `const` by default, `let` only when reassignment is needed.
- Functions use `camelCase`.
- Constants use `SCREAMING_SNAKE_CASE` for broad module-level values.
- Keep command execution argument-based where possible; avoid shell string interpolation for user input.
- Return structured objects from library helpers rather than throwing for normal validation outcomes.

Security-sensitive convention:
- Prefer `execFileSync(process.execPath, [script, ...args])` or argument-array process APIs.
- Validate project/user paths through helpers such as `validatePath()` in `get-shit-done/bin/lib/security.cjs`.
- Reject traversal, null bytes, and shell metacharacters where workflows accept path input.

## Markdown Workflow Style

Workflow files use XML-like sections:
- `<purpose>`
- `<available_agent_types>`
- `<required_reading>`
- `<process>`
- `<step name="...">`
- `<success_criteria>`

Step names are usually `snake_case`. Workflows should load context through `gsd-sdk query ...` rather than manually parsing `.planning/` files when a query handler exists.

When workflows are runtime-sensitive, include runtime compatibility/adaptation guidance. Codex installed skills include a `codex_skill_adapter`. Pi installed skills include optional `pi-subagents` adapter guidance.

## Agent Authoring

Agent source files use YAML frontmatter followed by XML-like body sections.

Common fields:
- `name: gsd-{role}`
- `description: ...`
- `tools: ...` or YAML list depending on source/runtime format
- `color:` for Claude-origin source agents

Important constraints:
- Do not add `skills:` frontmatter to agents; tests guard against this for runtime compatibility.
- File-writing agents should avoid heredoc patterns and use proper file-edit tools.
- Agent output should end with structured completion markers defined in `get-shit-done/references/agent-contracts.md`.
- New agents must be added to `sdk/shared/model-catalog.json`, or SDK profile tests will fail.

Pi agent conversion removes Claude-only fields and emits Pi-compatible frontmatter through `convertClaudeAgentToPiSubagentAgent`.

Codex agent conversion generates TOML config with sandbox and model fields.

## Model Routing Conventions

Use semantic tiers in source docs and config:
- `opus`
- `sonnet`
- `haiku`

Resolve concrete runtime model IDs through:
- `sdk/shared/model-catalog.json`
- `get-shit-done/bin/lib/model-catalog.cjs`
- `sdk/src/model-catalog.ts`
- `model_profile_overrides.<runtime>.<tier>`

Do not hardcode GPT/Codex or Pi model IDs in agent docs unless documenting defaults. Runtime-specific generated files should receive concrete model IDs from the catalog.

## Security Workflow Conventions

Security workflows follow a two-phase pattern:
- deterministic tools produce structured findings first
- scanner agents triage and reason over findings second

Important files:
- `get-shit-done/workflows/security-audit.md`
- `get-shit-done/workflows/threat-scan.md`
- `agents/gsd-security-scanner.md`
- `agents/gsd-threat-scanner.md`
- `get-shit-done/bin/security_prescan.py`
- `get-shit-done/semgrep/threat-patterns.yml`

Threat scan and security audit docs should distinguish:
- own-code vulnerability scanning
- untrusted-code deliberate threat scanning
- declared threat mitigation verification through `gsd-secure-phase`

## Test Style

CJS tests use Node's built-in runner:

```javascript
'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
```

Common helper import:

```javascript
const { createTempProject, cleanup, runGsdTools } = require('./helpers.cjs');
```

Cleanup conventions:
- Use `beforeEach`/`afterEach` for shared temp dirs.
- Use `t.after()` for per-test temp dirs.
- Avoid `try/finally` in test bodies.

Large content fixtures often use array `join('\n')` to avoid indentation bleed.

## Commit Conventions

Conventional commit types are used:
- `feat:`
- `fix:`
- `docs:`
- `test:`
- `refactor:`
- `ci:`
- `chore:`

GSD workflows often commit generated artifacts through:

```bash
gsd-sdk query commit "docs: map existing codebase" --files .planning/codebase/*.md
```

## Branch Organization Convention

For this fork:
- `feat/pi-runtime` contains Pi runtime support.
- `feat/security-skills` contains security and skill-authoring work.
- `my-mods` aggregates both feature branches.
- `upstream` points at `gsd-build/get-shit-done`.
- `origin` points at the user fork.

Keep topic branches separately mergeable with upstream. Put cross-branch integration fixes into the topic branch that owns the affected behavior when possible.

---

*Conventions analysis refreshed: 2026-05-13*
