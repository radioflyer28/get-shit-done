# Directory Structure

**Analysis Date:** 2026-05-13
**Mapped Commit:** `c582682e`

## Top-Level Layout

```text
get-shit-done/
├── .changeset/          # Changeset fragments for release notes/versioning
├── .github/workflows/   # GitHub Actions CI, release, security, and PR gates
├── .planning/           # GSD's own planning state and codebase map
├── .plans/              # Additional plan artifacts
├── agents/              # 38 specialized GSD agent definitions
├── assets/              # Visual/static assets
├── bin/                 # npm CLI entry points, primarily install.js
├── commands/gsd/        # 72 command/skill source files
├── docs/                # User, architecture, configuration, ADR, research docs
├── get-shit-done/       # Installed engine surface: workflows, refs, templates, bins
├── hooks/               # Runtime hook scripts
├── scripts/             # Build, lint, changeset, and scan scripts
├── sdk/                 # TypeScript SDK package
├── tests/               # 501 Node test files
├── package.json         # root package get-shit-done-cc
└── tsconfig.json        # root TypeScript config
```

## `agents/`

Each file defines one GSD subagent. Naming is `gsd-{role}.md`.

Important groups:
- Planning: `gsd-planner.md`, `gsd-plan-checker.md`, `gsd-roadmapper.md`, `gsd-framework-selector.md`
- Execution: `gsd-executor.md`, `gsd-code-fixer.md`, `gsd-doc-writer.md`
- Research: `gsd-project-researcher.md`, `gsd-phase-researcher.md`, `gsd-ai-researcher.md`, `gsd-domain-researcher.md`
- Verification: `gsd-verifier.md`, `gsd-integration-checker.md`, `gsd-nyquist-auditor.md`, `gsd-eval-auditor.md`
- Codebase mapping: `gsd-codebase-mapper.md`, `gsd-pattern-mapper.md`
- Debugging: `gsd-debugger.md`, `gsd-debug-session-manager.md`
- Security: `gsd-security-auditor.md`, `gsd-security-scanner.md`, `gsd-threat-scanner.md`
- Skill authoring: `gsd-skill-auditor.md`, `gsd-skill-scaffolder.md`, `gsd-skill-tuner.md`
- UI: `gsd-ui-researcher.md`, `gsd-ui-checker.md`, `gsd-ui-auditor.md`

## `bin/`

Root CLI directory:
- `bin/install.js` is the package installer and runtime converter.
- `bin/gsd-sdk.js` is the root shim into the built SDK CLI.

`bin/install.js` is the highest-risk single file. It owns runtime detection, conversion, staging, install/uninstall, and validation logic for all supported runtimes.

## `commands/gsd/`

Command/skill source files. The current tree has 72 Markdown files.

Examples:
- `commands/gsd/new-project.md`
- `commands/gsd/plan-phase.md`
- `commands/gsd/execute-phase.md`
- `commands/gsd/map-codebase.md`
- `commands/gsd/security-audit.md`
- `commands/gsd/threat-scan.md`
- `commands/gsd/audit-skill.md`
- `commands/gsd/build-skill.md`
- `commands/gsd/tune-skill.md`

These files contain runtime adapters for Codex and are converted/staged for other runtimes by the installer.

## `get-shit-done/`

This is the installed product engine.

Key subdirectories:
- `get-shit-done/workflows/` — 109 workflow prompt programs.
- `get-shit-done/references/` — 116 reference files.
- `get-shit-done/templates/` — 46 templates.
- `get-shit-done/bin/` — shipped helper commands and scanner scripts.
- `get-shit-done/bin/lib/` — CommonJS runtime libraries.
- `get-shit-done/semgrep/` — adversarial threat pattern rules.

Important shipped binaries/scripts:
- `get-shit-done/bin/gsd-tools.cjs`
- `get-shit-done/bin/security-prescan.sh`
- `get-shit-done/bin/security_prescan.py`
- `get-shit-done/bin/supply_chain_intel.py`
- `get-shit-done/bin/scan_ci.sh`
- `get-shit-done/bin/scan_baseline.py`
- `get-shit-done/bin/scan_state.py`
- `get-shit-done/bin/sbom_generate.sh`
- `get-shit-done/bin/git_forensics.sh`
- `get-shit-done/bin/git_forensics_report.py`

## `get-shit-done/bin/lib/`

CommonJS query/runtime modules.

Largest modules:
- `core.cjs` (~88 KB)
- `init.cjs` (~78 KB)
- `state.cjs` (~76 KB)
- `verify.cjs` (~58 KB)
- `phase.cjs` (~56 KB)
- `profile-output.cjs` (~50 KB)
- `commands.cjs` (~38 KB)
- `installer-migrations.cjs` (~25 KB)
- `audit.cjs` (~24 KB)
- `roadmap.cjs` (~23 KB)
- `config.cjs` (~23 KB)
- `install-profiles.cjs` (~22 KB)

Model and runtime support lives in:
- `model-catalog.cjs`
- `model-profiles.cjs`
- `runtime-homes.cjs`
- `profile-output.cjs`

## `get-shit-done/references/`

Reference docs are loaded by workflows/agents as needed.

Important references:
- `agent-contracts.md`
- `context-budget.md`
- `git-integration.md`
- `model-profiles.md`
- `planning-config.md`
- `verification-overrides.md`
- `skill-authoring.md`
- `skill-smart-criteria.md`
- `prescan-tool-registry.md`
- `owasp-top-10-foundation.md`
- language security references such as `python-security-patterns.md`, `javascript-typescript-security-patterns.md`, `go-security-patterns.md`, and `rust-security-patterns.md`
- framework references under `get-shit-done/references/languages/frameworks/`

## `hooks/`

Hook scripts installed for supported runtimes, especially Claude and Codex.

Examples:
- `hooks/gsd-context-monitor.js`
- `hooks/gsd-statusline.js`
- `hooks/gsd-update-banner.js`
- `hooks/gsd-workflow-guard.js`
- `hooks/gsd-prompt-guard.js`
- `hooks/gsd-read-guard.js`
- `hooks/gsd-phase-boundary.sh`
- `hooks/gsd-session-state.sh`
- `hooks/gsd-validate-commit.sh`

There are 13 files in `hooks/` in this branch.

## `sdk/`

Standalone TypeScript SDK.

Key paths:
- `sdk/package.json`
- `sdk/shared/model-catalog.json`
- `sdk/src/cli.ts`
- `sdk/src/index.ts`
- `sdk/src/session-runner.ts`
- `sdk/src/model-catalog.ts`
- `sdk/src/query/`
- `sdk/src/query/config-query.ts`
- `sdk/src/query/helpers.ts`
- `sdk/src/query/registry.ts`

SDK query tests are colocated in `sdk/src/**/*.test.ts`.

## `tests/`

Flat directory of CJS tests. Current count is 501 `.test.cjs` files.

Notable test areas:
- installer/runtimes: `pi-install.test.cjs`, `runtime-converters.test.cjs`, `multi-runtime-select.test.cjs`, `install-minimal-all-runtimes.test.cjs`
- Codex config: `codex-config.test.cjs`
- security tools: `phase-06-prescan.test.cjs`, `phase10-scanner-operations.test.cjs`, `threat-patterns-validation.test.cjs`, `security-patterns-phase7.test.cjs`
- core libraries: `core.test.cjs`, `state.test.cjs`, `phase.test.cjs`, `verify.test.cjs`, `commands.test.cjs`
- model routing: `issue-2517-runtime-aware-profiles.test.cjs`, `model-catalog-runtime-defaults.test.cjs`

## Where To Add Code

New runtime:
- `bin/install.js`
- `get-shit-done/bin/lib/runtime-homes.cjs`
- `sdk/shared/model-catalog.json` if runtime has model defaults
- installer tests under `tests/*install*.test.cjs`
- docs in `docs/CONFIGURATION.md`, `docs/USER-GUIDE.md`, `docs/ARCHITECTURE.md`

New GSD command/skill:
- `commands/gsd/{name}.md`
- `get-shit-done/workflows/{name}.md`
- optional `agents/gsd-{role}.md`
- tests under `tests/`
- model catalog entry for new agents in `sdk/shared/model-catalog.json`

New SDK query:
- `sdk/src/query/{domain}.ts`
- register in query registry
- add tests under `sdk/src/query/*.test.ts`
- add CJS parity only if workflows still call legacy `gsd-tools`

New security scanner capability:
- helper script in `get-shit-done/bin/`
- rules/reference in `get-shit-done/references/` or `get-shit-done/semgrep/`
- workflow integration in `security-audit.md` or `threat-scan.md`
- tests under `tests/phase*.test.cjs` or focused security test files

---

*Structure analysis refreshed: 2026-05-13*
