# Directory Structure

**Analysis Date:** 2026-04-14

## Top-Level Layout

```
get-shit-done/
├── agents/             # Specialized subagent definition files (~33 agents)
├── bin/                # npm CLI entry point
│   └── install.js      # Installer script (npx get-shit-done-cc@latest)
├── commands/           # Legacy Claude Code slash command format
│   └── gsd/            # ~75 .md command files (pre-v2.1.88 format)
├── docs/               # User-facing documentation
├── get-shit-done/      # Core workflow engine (the installed product)
│   ├── bin/lib/        # CommonJS utility libraries (~25 .cjs modules)
│   ├── contexts/       # Context profiles (dev.md, research.md, review.md)
│   ├── references/     # Shared reference docs for workflows (~40+ .md files)
│   ├── templates/      # Planning artifact templates (~44 files)
│   └── workflows/      # Workflow definitions (~72 .md files, one per command)
├── hooks/              # Claude Code lifecycle hooks (~10 .js/.sh files)
├── scripts/            # Build and security scan scripts
├── sdk/                # TypeScript SDK for programmatic access
│   └── src/            # Source files + tests (~47 .ts files)
│       └── query/      # Registry-based typed query submodule
├── tests/              # Test suite
├── .planning/          # GSD's own planning state (meta — GSD uses itself)
├── .github/            # GitHub Actions workflows
├── .plans/             # Additional plan artifacts
├── package.json        # npm package config (name: get-shit-done-cc, v1.36.0)
├── tsconfig.json       # TypeScript config (for SDK)
├── vitest.config.ts    # Root Vitest config
└── CHANGELOG.md        # Version history
```

## Key Directories

### `agents/`
One `.md` file per specialized subagent role. These are loaded automatically when a workflow spawns an agent via `Task(subagent_type="gsd-executor", ...)`. Never read manually by orchestrators.

Key agents:
- `gsd-executor.md` — executes plan tasks, commits, writes SUMMARY.md
- `gsd-planner.md` — creates PLAN.md from phase scope
- `gsd-verifier.md` — post-execution quality verification
- `gsd-phase-researcher.md` — technical approach research for a single phase
- `gsd-project-researcher.md` — project-wide research and discovery
- `gsd-plan-checker.md` — plan quality review (revision gate)
- `gsd-debugger.md` — root cause investigation
- `gsd-roadmapper.md` — creates/revises ROADMAP.md
- `gsd-codebase-mapper.md` — codebase analysis (this agent's definition)
- `gsd-security-scanner.md` / `gsd-threat-scanner.md` — security analysis
- `gsd-ui-researcher.md` / `gsd-ui-checker.md` / `gsd-ui-auditor.md` — UI workflow agents

### `bin/`
Contains only `install.js`. This is the `bin` entry registered in `package.json`. Handles: runtime selection (interactive or flag-based), global vs. local install, WSL detection, file copying, Copilot tool name mapping, Codex sandbox config, uninstall logic.

### `commands/gsd/`
~75 `.md` files in the older Claude Code slash command format (pre-2.1.88). Each file is a standalone prompt that references workflow content. The installer writes these for Claude Code versions below 2.1.88.

### `get-shit-done/workflows/`
The heart of the system. ~72 `.md` files using XML-structured prompt format (`<purpose>`, `<required_reading>`, `<available_agent_types>`, `<process>`, `<step>`). Each file is one `/gsd-*` command.

Notable workflows:
- `new-project.md` — full project initialization with research + roadmap
- `plan-phase.md` — spec-driven plan creation with revision gate
- `execute-phase.md` — wave-based parallel execution orchestration
- `next.md` — smart routing to next logical action
- `autonomous.md` — runs all remaining phases without human intervention
- `progress.md` — project state display
- `debug.md` — systematic debugging with persistent state
- `health.md` — planning directory health check and repair

### `get-shit-done/references/`
Shared knowledge loaded by `@` references in workflows. Not loaded by default — workflows include only what they need (context budget discipline).

Key references:
- `agent-contracts.md` — completion markers and handoff schemas for all agents
- `gates.md` — gate taxonomy (pre-flight, revision, escalation, abort)
- `context-budget.md` — rules for keeping orchestrator context lean
- `verification-patterns.md` — how to validate deliverables
- `verification-overrides.md` — developer-approved overrides for verification
- `planner-antipatterns.md` — what planners must not do
- `model-profiles.md` — quality/balanced/budget/inherit profile definitions
- `tdd.md` — test-driven development pipeline reference
- `git-integration.md` — commit and branch conventions
- `thinking-models-*.md` — guidance for extended thinking models

### `get-shit-done/bin/lib/`
CommonJS utilities called by workflows when structured data manipulation is needed. Key modules:
- `state.cjs` — read/write `.planning/STATE.md`
- `roadmap.cjs` — parse and mutate ROADMAP.md phase entries
- `phase.cjs` — phase lifecycle operations
- `milestone.cjs` — milestone archiving and transition
- `verify.cjs` — verification report generation
- `workstream.cjs` — parallel workstream management
- `security.cjs` — security scan helpers
- `schema-detect.cjs` — ORM schema drift detection
- `graphify.cjs` — knowledge graph operations
- `intel.cjs` — codebase intelligence management
- `init.cjs` — `.planning/` scaffold initialization
- `model-profiles.cjs` — profile resolution logic

### `get-shit-done/templates/`
Boilerplate files copied into `.planning/` on `gsd-new-project`. Key templates:
- `config.json` — default project configuration
- `roadmap.md` — ROADMAP.md structure
- `milestone.md` — per-milestone tracking
- `phase-prompt.md` — phase definition format
- `verification-report.md` — verifier output structure
- `AI-SPEC.md` — AI integration phase spec
- `copilot-instructions.md` — Copilot-specific instructions wrapper

### `get-shit-done/contexts/`
Three context profiles loaded depending on operation type:
- `dev.md` — development execution context
- `research.md` — research and discovery context
- `review.md` — code review and audit context

### `hooks/`
Claude Code lifecycle hook scripts injected at install time. Runs on `PostToolUse` / `AfterTool` events:
- `gsd-context-monitor.js` — reads context metrics, injects warnings at ≤35% / ≤25% remaining
- `gsd-statusline.js` — writes per-session context metrics to `/tmp/claude-ctx-{id}.json`
- `gsd-prompt-guard.js` — validates prompt structure before execution
- `gsd-read-guard.js` — restricts reads to authorized paths
- `gsd-phase-boundary.sh` — enforces phase isolation
- `gsd-workflow-guard.js` — blocks invalid workflow state transitions
- `gsd-validate-commit.sh` — enforces commit message conventions
- `gsd-session-state.sh` — persists session continuity data
- `gsd-check-update.js` + `gsd-check-update-worker.js` — background version check

### `sdk/`
Standalone TypeScript package for programmatic/headless GSD usage. Has its own `package.json`, `tsconfig.json`, `vitest.config.ts`. Key source files in `sdk/src/`:
- `index.ts` — public API, exports `GSD` class, `PhaseRunner`, `MilestoneRunner`
- `cli.ts` — CLI entry for `gsd-sdk` command
- `plan-parser.ts` — parses PLAN.md YAML frontmatter + XML task bodies
- `prompt-builder.ts` — constructs executor prompts from plan + context
- `session-runner.ts` — drives an AI session for a single plan
- `phase-runner.ts` — orchestrates all plans in a phase
- `context-engine.ts` — manages context loading and budget
- `config.ts` — loads `.planning/config.json`
- `gsd-tools.ts` — tool definitions and path resolution
- `event-stream.ts` — event emitter for SDK consumers
- `ws-transport.ts` — WebSocket transport for streaming results
- `types.ts` — shared TypeScript interfaces (PlanResult, GSDOptions, MustHaves, etc.)
- `query/` — registry-based typed query handlers (state, roadmap, phase lifecycle, config)

### `scripts/`
Build and security automation:
- `build-hooks.js` — compiles hooks for distribution (called by `prepublishOnly`)
- `run-tests.cjs` — test runner orchestration
- `secret-scan.sh` — scans for leaked secrets before publish
- `prompt-injection-scan.sh` — scans workflow files for prompt injection
- `base64-scan.sh` — detects encoded payloads

### `tests/`
Test suite for SDK and utility modules. Co-located `.test.ts` files also exist in `sdk/src/`.

## File Naming Conventions

**Workflows and agents:**
- `{verb}-{noun}.md` — e.g., `execute-phase.md`, `plan-phase.md`, `add-backlog.md`
- Always kebab-case
- Match the `/gsd-{name}` command they implement

**Agents:**
- `gsd-{role}.md` — e.g., `gsd-executor.md`, `gsd-planner.md`
- Prefixed with `gsd-` to namespace against user project agents

**Runtime libraries:**
- `{domain}.cjs` — e.g., `state.cjs`, `roadmap.cjs`, `phase.cjs`
- All CommonJS for Node.js compatibility without transpile step

**SDK source:**
- `{module-name}.ts` — e.g., `plan-parser.ts`, `prompt-builder.ts`
- Tests: `{module-name}.test.ts` co-located with source
- Integration tests: `{module-name}.integration.test.ts`

**Templates:**
- `UPPERCASE.md` for planning artifacts (PLAN.md, SUMMARY.md, ROADMAP.md, STATE.md)
- `lowercase.md` for reference/config (config.json, discovery.md)

**Hooks:**
- `gsd-{purpose}.js` or `gsd-{purpose}.sh`
- Prefixed with `gsd-` to avoid conflicts in user project hook directories

## Where to Add New Code

**New `/gsd-*` command:**
- Workflow: `get-shit-done/workflows/{verb}-{noun}.md`
- Legacy command: `commands/gsd/{verb}-{noun}.md`
- If it needs a specialized agent: `agents/gsd-{role}.md`

**New runtime library utility:**
- `get-shit-done/bin/lib/{domain}.cjs`

**New SDK feature:**
- Implementation: `sdk/src/{module}.ts`
- Tests: `sdk/src/{module}.test.ts`

**New planning template:**
- `get-shit-done/templates/{ARTIFACT-NAME}.md`

**New reference document:**
- `get-shit-done/references/{topic}.md`

---

*Structure analysis: 2026-04-14*
