# Architecture

**Analysis Date:** 2026-04-14

## System Overview

GSD (Get Shit Done) is a meta-prompting, context engineering, and spec-driven development system. It installs workflow instructions into AI coding tools (Claude Code, GitHub Copilot, Gemini CLI, Codex, Cursor, Windsurf, and ~10 others) and provides a structured planning layer that manages an entire project lifecycle — from ideation through phased execution to milestone archiving.

The core idea: workflows decompose work into phases, plans, and tasks, then orchestrate specialized AI subagents to execute each piece, quality-gate outputs, and accumulate state in a `.planning/` directory in the user's project.

## Core Subsystems

### 1. Installer (`bin/install.js`)
Single entry point for `npx get-shit-done-cc@latest`. Handles runtime detection (Claude Code, Copilot, Gemini, Codex, etc.), interactive multi-select prompts, and copies the appropriate files to the correct config directory for each runtime. Supports global (`~/.claude/`, `~/.gemini/`, etc.) and local (`.claude/`, `.github/`, etc.) installs.

### 2. Workflow Engine (`get-shit-done/workflows/`)
~72 Markdown workflow files, one per `/gsd-*` command. Each file is an XML-structured prompt document consumed by the AI's context when the command is invoked. Workflows define: purpose, required reading, available subagent types, and a step-by-step process with conditional branching.

### 3. Agent Registry (`agents/`)
~33 specialized agent definition `.md` files. Each agent has a focused role (planner, executor, verifier, researcher, debugger, etc.). Agents are spawned by orchestrator workflows via the `Task` tool. They signal completion using standardized text markers (e.g., `## PLANNING COMPLETE`, `## PLAN COMPLETE`).

### 4. Reference Library (`get-shit-done/references/`)
~40+ shared reference documents loaded by workflows and agents as needed. Covers: agent contracts, gate taxonomy, context budget rules, verification patterns, TDD pipeline, model profiles, git integration, planner anti-patterns, and more. This is the system's shared knowledge base.

### 5. Runtime Libraries (`get-shit-done/bin/lib/`)
CommonJS utility modules (`.cjs`) providing shared logic: `state.cjs`, `roadmap.cjs`, `phase.cjs`, `milestone.cjs`, `verify.cjs`, `workstream.cjs`, `security.cjs`, `schema-detect.cjs`, `graphify.cjs`, `intel.cjs`, and others. Called by workflows that need structured data manipulation.

### 6. Hooks (`hooks/`)
Claude Code lifecycle hooks that run before/after tool calls:
- `gsd-context-monitor.js` — injects warnings when context window fills (≤35% remaining: WARNING, ≤25%: CRITICAL)
- `gsd-statusline.js` — writes context metrics to a bridge file for the monitor
- `gsd-prompt-guard.js` — validates prompt structure
- `gsd-read-guard.js` — guards file reads
- `gsd-phase-boundary.sh` — enforces phase boundaries
- `gsd-workflow-guard.js` — prevents invalid workflow transitions
- `gsd-validate-commit.sh` — validates commit format
- `gsd-session-state.sh` — persists session state
- `gsd-check-update.js` / `gsd-check-update-worker.js` — checks for GSD version updates

### 7. Templates (`get-shit-done/templates/`)
Boilerplate for planning artifacts: `roadmap.md`, `milestone.md`, `config.json`, `phase-prompt.md`, `verification-report.md`, `SECURITY.md`, `AI-SPEC.md`, `DEBUG.md`, and others. Used by `/gsd-new-project` and related commands to scaffold `.planning/`.

### 8. SDK (`sdk/`)
TypeScript SDK for programmatic, headless access to GSD workflows. Exposes a `GSD` class that composes `parsePlan`, `loadConfig`, `buildExecutorPrompt`, and `runPlanSession`. Includes a `PhaseRunner`, `ContextEngine`, `PromptFactory`, `GSDEventStream`, and a `query/` submodule with registry-based typed queries.

### 9. Legacy Commands (`commands/gsd/`)
Older Claude Code slash command format (pre-v2.1.88). Mirrors the `get-shit-done/workflows/` files but in the format expected by older Claude Code versions. The installer writes these for compatibility.

## Data Flow

### Primary Flow: User Command → Execution

```
1. User types `/gsd-execute-phase 03` in AI tool
2. AI loads workflow from installed path (e.g., ~/.claude/get-shit-done/workflows/execute-phase.md)
3. Workflow reads STATE.md from .planning/ to get current project context
4. Workflow applies pre-flight gate: verifies PLAN.md exists for phase 03
5. Workflow groups plans into dependency waves
6. For each wave: spawns gsd-executor subagents in parallel via Task tool
7. gsd-executor writes code, commits atomically, writes SUMMARY.md
8. Orchestrator detects ## PLAN COMPLETE marker from each agent
9. gsd-verifier spawned to verify deliverables against must_haves in PLAN.md
10. On pass: STATE.md updated, phase marked complete
11. On fail: escalation gate surfaces issues to developer
```

### Planning Flow: Idea → Roadmap

```
1. /gsd-new-project → questions developer, spawns gsd-project-researcher
2. Research synthesized into REQUIREMENTS.md by gsd-research-synthesizer
3. /gsd-plan-phase → gsd-planner creates PLAN.md with YAML frontmatter + XML tasks
4. gsd-plan-checker revision gate: reviews plan, loops up to 3 iterations
5. Approved PLAN.md written to .planning/phases/{N}-{name}/{N}-{name}-{NN}-PLAN.md
```

### Context Protection Flow

```
gsd-statusline.js (PostToolUse) → writes metrics to /tmp/claude-ctx-{session}.json
gsd-context-monitor.js (PostToolUse) → reads metrics, injects additionalContext warnings
Agent receives warning → saves checkpoint or stops gracefully
```

### State Management

All persistent state lives in `.planning/` within the user's project:
- `STATE.md` — current milestone, phase, active workstream, error state
- `ROADMAP.md` — phased execution plan
- `phases/{N}-{name}/PLAN.md` — task definitions with YAML frontmatter `must_haves`
- `phases/{N}-{name}/SUMMARY.md` — executor completion record
- `phases/{N}-{name}/VERIFICATION.md` — verifier output
- `config.json` — project config (model profile, context window, YOLO mode)

## Key Design Patterns

### Orchestrator / Subagent Pattern
Workflows are orchestrators — they coordinate, not execute. Heavy work is always delegated to named subagents (`gsd-executor`, `gsd-planner`, `gsd-verifier`, etc.) via the `Task` tool. The orchestrator only routes based on completion markers.

### Agent Contract Pattern
Agents signal state via standardized H2 markers at end of output: `## PLANNING COMPLETE`, `## PLAN COMPLETE`, `## CHECKPOINT REACHED`, etc. Defined in `get-shit-done/references/agent-contracts.md`. The orchestrator parses these to determine next action.

### Gate Pattern (4 gate types)
Defined in `get-shit-done/references/gates.md`:
- **Pre-flight**: blocks entry if preconditions unmet (e.g., no PLAN.md)
- **Revision**: loops producer → checker up to N iterations (stall detection included)
- **Escalation**: pauses for human decision when loops exhaust
- **Abort**: immediate stop to prevent waste or damage

### Context Budget Management
Every workflow that spawns agents references `references/context-budget.md`. Read depth scales with context window size (< 500K tokens = frontmatter only; ≥ 500K = full bodies). Hooks provide real-time enforcement.

### Spec-First / Must-Haves Contract
Every PLAN.md carries a `must_haves` YAML frontmatter block with `truths`, `artifacts`, and `key_links`. The verifier agent validates against these post-execution, not against vague prose.

### Wave-Based Parallelism
`execute-phase.md` groups plans by dependency into "waves." Independent plans within a wave run in parallel subagents; dependent plans run sequentially across waves.

### Runtime Polymorphism
The installer generates runtime-specific file formats from the same source: skill files for Claude Code 2.1.88+, command files for older Claude Code, `.clinerules` for Cline, `.github/copilot-instructions.md` for Copilot, `AGENTS.md` for other runtimes. Tool name mapping (`Read` → `read`, `Bash` → `execute`) is applied per runtime.

## Entry Points

**CLI Installer:**
- `bin/install.js` — invoked via `npx get-shit-done-cc@latest`
- Flags: `--claude`, `--copilot`, `--gemini`, `--codex`, `--global`, `--local`, `--uninstall`, `--all`

**User-facing Commands (invoked in AI tools):**
- `/gsd-new-project` → starts a new project
- `/gsd-plan-phase` → plans a phase
- `/gsd-execute-phase` → executes all plans in a phase
- `/gsd-next` → advances to next logical step
- `/gsd-progress` → shows current project state
- `/gsd-help` → lists all commands
- ~65 other `/gsd-*` commands defined in `get-shit-done/workflows/`

**Programmatic SDK:**
- `sdk/src/index.ts` — exports `GSD` class, `PhaseRunner`, `MilestoneRunner`
- `GSD.executePlan(planPath)` — runs a single plan headlessly
- `PhaseRunner.runPhase(phaseDir)` — runs all plans in a phase
- `sdk/src/cli.ts` — CLI wrapper for SDK commands including `gsd-sdk query`

---

*Architecture analysis: 2026-04-14*
