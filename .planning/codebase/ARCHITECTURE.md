# Architecture

**Analysis Date:** 2026-05-13
**Mapped Commit:** `c582682e`

## System Overview

GSD is a multi-runtime workflow system for AI-assisted software delivery. It packages a set of skills, command prompts, agent definitions, runtime libraries, templates, and hooks that install into coding agents such as Claude Code, Codex, Pi, Gemini, OpenCode, and other tools.

The product has two major responsibilities:
- Install the correct runtime-specific surface into the user's AI tool home.
- Provide workflow and query primitives that manage project planning, execution, review, verification, security checks, and documentation through `.planning/`.

The current branch combines the Pi runtime work with the security-skills work. That means runtime conversion and model routing now sit beside a larger security analysis subsystem.

## Core Subsystems

### Installer

`bin/install.js` is the main entry point for `get-shit-done-cc`.

Responsibilities:
- Parse runtime flags such as `--codex` and `--pi`.
- Resolve global and local install directories.
- Stage skill profiles through `get-shit-done/bin/lib/install-profiles.cjs`.
- Convert Claude-origin agent/skill content into runtime-specific formats.
- Install engine files under runtime homes.
- Generate Codex agent TOML and hooks.
- Generate Pi skill and pi-subagents-compatible agent files.
- Write `gsd-file-manifest.json`, `gsd-install-state.json`, `VERSION`, and supporting package metadata.
- Verify installed SDK readiness.

This file is still a large central orchestrator: about 10,152 lines and roughly 470 KB.

### Workflow Surface

Workflow source lives in `get-shit-done/workflows/` and currently contains 109 Markdown workflow files.

Workflows are structured prompt programs with XML-like sections such as:
- `<purpose>`
- `<required_reading>`
- `<available_agent_types>`
- `<process>`
- `<step>`

Key workflows include:
- `get-shit-done/workflows/new-project.md`
- `get-shit-done/workflows/plan-phase.md`
- `get-shit-done/workflows/execute-phase.md`
- `get-shit-done/workflows/map-codebase.md`
- `get-shit-done/workflows/security-audit.md`
- `get-shit-done/workflows/threat-scan.md`
- `get-shit-done/workflows/audit-skill.md`
- `get-shit-done/workflows/build-skill.md`
- `get-shit-done/workflows/tune-skill.md`

### Skill Surface

Installed skills are generated from `commands/gsd/*.md` and workflow references. The current source has 72 command files under `commands/gsd/`.

The Codex-installed skill shape includes a `codex_skill_adapter` block. The Pi-installed skill shape gets Pi adapter guidance, including optional `pi-subagents` mapping from GSD's agent-style workflow syntax to Pi's `subagent` tool when available.

### Agent Registry

Specialized agents live under `agents/`, currently 38 files.

Core agents:
- `agents/gsd-planner.md`
- `agents/gsd-executor.md`
- `agents/gsd-verifier.md`
- `agents/gsd-codebase-mapper.md`
- `agents/gsd-code-reviewer.md`
- `agents/gsd-debugger.md`

Security and skill agents added by this fork:
- `agents/gsd-security-scanner.md`
- `agents/gsd-threat-scanner.md`
- `agents/gsd-security-auditor.md`
- `agents/gsd-skill-auditor.md`
- `agents/gsd-skill-scaffolder.md`
- `agents/gsd-skill-tuner.md`

### Runtime Libraries

CommonJS runtime libraries live under `get-shit-done/bin/lib/`.

Large central modules:
- `get-shit-done/bin/lib/core.cjs`
- `get-shit-done/bin/lib/init.cjs`
- `get-shit-done/bin/lib/state.cjs`
- `get-shit-done/bin/lib/verify.cjs`
- `get-shit-done/bin/lib/phase.cjs`
- `get-shit-done/bin/lib/profile-output.cjs`
- `get-shit-done/bin/lib/commands.cjs`
- `get-shit-done/bin/lib/install-profiles.cjs`
- `get-shit-done/bin/lib/model-catalog.cjs`

These libraries back `gsd-sdk query ...` and legacy `gsd-tools` behavior.

### SDK

The SDK package under `sdk/` is TypeScript and provides programmatic access to GSD operations.

Important SDK components:
- `sdk/src/cli.ts` for `gsd-sdk`.
- `sdk/src/index.ts` public API.
- `sdk/src/session-runner.ts` for model/session execution.
- `sdk/src/query/` registry handlers for state, config, phase, roadmap, skills, validation, and related queries.
- `sdk/src/model-catalog.ts` mirrors CJS model catalog behavior.
- `sdk/shared/model-catalog.json` is the shared source of truth for agents, tiers, phase types, and runtime defaults.

### Security Scanner Subsystem

Security scanner tooling now exists as code, not just documentation:
- Prescan shell entry: `get-shit-done/bin/security-prescan.sh`
- Prescan orchestrator: `get-shit-done/bin/security_prescan.py`
- Pattern loader: `get-shit-done/bin/lib/pattern-loader.cjs`
- CI helper: `get-shit-done/bin/scan_ci.sh`
- Baseline helper: `get-shit-done/bin/scan_baseline.py`
- Scan state helper: `get-shit-done/bin/scan_state.py`
- SBOM helper: `get-shit-done/bin/sbom_generate.sh`
- Supply-chain intelligence helper: `get-shit-done/bin/supply_chain_intel.py`
- Git forensics: `get-shit-done/bin/git_forensics.sh`, `get-shit-done/bin/git_forensics_report.py`
- Adversarial Semgrep rules: `get-shit-done/semgrep/threat-patterns.yml`

Security workflows use these tools to produce structured findings, then hand those findings to scanner agents for reasoning and triage.

## Data Flow

### Install Flow

```text
CLI invocation
-> bin/install.js parses runtime, location, profile
-> runtime home resolved
-> skills staged from commands/workflows
-> engine files copied to get-shit-done/
-> agents converted for runtime
-> hooks/config generated where supported
-> SDK readiness checked
-> manifest and install state written
```

Pi-specific branch:

```text
--pi
-> global ~/.pi/agent or local .pi
-> install skills/
-> install get-shit-done/
-> convert agents through convertClaudeAgentToPiSubagentAgent
-> inject Pi subagent adapter into core workflow skills
-> write model/thinking fields when runtime config resolves Pi tiers
```

Codex-specific branch:

```text
--codex
-> ~/.codex or .codex
-> install skills/
-> install agents/
-> generate config.toml and per-agent TOML
-> embed model and model_reasoning_effort from runtime-aware model catalog
-> configure hooks
```

### Workflow Execution Flow

```text
User invokes installed skill/command
-> runtime loads SKILL.md or command markdown
-> workflow loads .planning state through gsd-sdk query
-> workflow may spawn agents or use sequential fallback
-> agents/tools write plans, summaries, docs, reviews, or code
-> gsd-sdk query commit creates scoped commits when enabled
-> .planning/STATE.md and related artifacts are updated
```

### Model Resolution Flow

```text
agent type
-> sdk/shared/model-catalog.json metadata
-> model_profile quality/balanced/budget/adaptive/inherit
-> phase type tier override from models.<phaseType>
-> runtime tier default from runtimeTierDefaults
-> model_profile_overrides merge
-> per-agent model_overrides final override
-> runtime-specific agent config/frontmatter output
```

## Architectural Patterns

### Runtime Polymorphism

One source set is converted to many runtime formats. The conversion layer handles:
- frontmatter differences
- tool allowlist differences
- runtime path replacements
- skill adapters
- agent model fields
- hooks and config output

Pi and Codex are now first-class examples of this pattern.

### Workflow-As-Orchestrator

Workflows coordinate and gate work. Agents or inline runtime steps do the heavy work. This pattern is explicit in files such as `get-shit-done/workflows/execute-phase.md`, `get-shit-done/workflows/plan-phase.md`, and `get-shit-done/workflows/map-codebase.md`.

### Shared Query Layer

`gsd-sdk query ...` is the stable bridge between prompt workflows and structured code. Workflows avoid ad hoc parsing where possible and call query handlers for state, config, roadmap, phase, commit, and validation operations.

### Catalog-Driven Model Selection

Agent tiering and runtime model defaults moved into `sdk/shared/model-catalog.json`, reducing hardcoded model tables across CJS and TypeScript.

### Deterministic Scan Then AI Triage

Security workflows run deterministic tools first, normalize findings, then ask security agents to reason about impact, false positives, and remediation.

## Entry Points

User/install entry points:
- `bin/install.js`
- `bin/gsd-sdk.js`
- `get-shit-done/bin/gsd-tools.cjs`

Runtime entry points:
- `commands/gsd/*.md`
- `get-shit-done/workflows/*.md`
- installed `skills/gsd-*/SKILL.md`

SDK entry points:
- `sdk/src/cli.ts`
- `sdk/src/index.ts`
- `sdk/src/query/registry.ts`

Security entry points:
- `get-shit-done/workflows/security-audit.md`
- `get-shit-done/workflows/threat-scan.md`
- `get-shit-done/workflows/secure-phase.md`
- `get-shit-done/bin/security-prescan.sh`

---

*Architecture analysis refreshed: 2026-05-13*
