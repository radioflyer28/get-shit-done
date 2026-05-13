# External Integrations

**Analysis Date:** 2026-05-13
**Mapped Commit:** `c582682e`

## AI Runtime Integrations

GSD integrates with AI coding tools by installing runtime-specific skills, commands, agents, hooks, and configuration files. The installer entry point is `bin/install.js`.

Supported runtime flags include:
- `--claude`
- `--opencode`
- `--gemini`
- `--kilo`
- `--codex`
- `--copilot`
- `--antigravity`
- `--cursor`
- `--windsurf`
- `--augment`
- `--trae`
- `--qwen`
- `--hermes`
- `--pi`
- `--cline`
- `--codebuddy`
- `--all`

Runtime install roots are resolved through `get-shit-done/bin/lib/runtime-homes.cjs` and parallel logic in `bin/install.js`. Examples:
- Codex global: `~/.codex`
- Pi global: `~/.pi/agent`
- Pi local: `.pi`
- Claude global: `~/.claude`
- Gemini global: `~/.gemini`

## Pi Integration

Pi is installed with `npx get-shit-done-cc --pi --global` or from source with `node bin/install.js --pi --global`.

Pi-specific behavior:
- Skills are converted to Pi skill shape under `skills/gsd-*/SKILL.md`.
- Engine files are installed under `get-shit-done/`.
- Agents are converted by `convertClaudeAgentToPiSubagentAgent` in `bin/install.js`.
- Agent frontmatter strips Claude-only fields such as `color`, `hooks`, and Claude-specific tool allowlists.
- Pi agents receive `systemPromptMode: append`, `inheritProjectContext: true`, `inheritSkills: false`, `defaultContext: fresh`, and `maxSubagentDepth: 0`.
- The Pi skill adapter injected by `injectPiSubagentsSkillAdapter` documents optional `pi-subagents` behavior.
- If the Pi `subagent` tool is unavailable, workflows should use sequential fallback behavior rather than fail.

Optional Pi package:
- `pi-subagents` from `https://pi.dev/packages/pi-subagents`
- Install with `pi install npm:pi-subagents` from a terminal where `pi` is available.

## Codex Integration

Codex install writes:
- `~/.codex/skills/gsd-*/SKILL.md`
- `~/.codex/get-shit-done/`
- `~/.codex/agents/gsd-*.md`
- `~/.codex/config.toml`
- per-agent TOML config files
- Codex hooks such as SessionStart configuration

Codex model routing is generated from `sdk/shared/model-catalog.json`. Generated agent TOML can embed:
- `model = "gpt-5.5"` or related tier defaults
- `model_reasoning_effort = "high" | "medium" | "low"`
- sandbox settings from Codex-specific agent policy tests in `tests/codex-config.test.cjs`

## Model Provider Integrations

The shared model catalog provides deterministic runtime tier defaults:
- Claude aliases for Claude-like runtimes
- provider-qualified OpenCode and Hermes defaults
- Gemini model defaults
- Qwen model defaults
- Codex GPT/Codex defaults
- Pi OpenAI Codex provider defaults

Model routing can be overridden by project config:
- `model_overrides.<agent>`
- `model_profile_overrides.<runtime>.<tier>`
- `models.<phaseType>` tier selection
- `model_profile` values such as `quality`, `balanced`, `budget`, `adaptive`, and `inherit`

## Package Registries

Publishing and install integration:
- npm package: `get-shit-done-cc`
- SDK package metadata: `@gsd-build/sdk`
- Global execution path: `npx get-shit-done-cc@latest`
- Local-source install path: `node bin/install.js ...`

The installer also verifies that `gsd-sdk` resolves to a compatible version. If PATH resolves a stale global shim, workflows that call `gsd-sdk query ...` may fail or use old behavior.

## External Security Services

Security tooling can call external vulnerability and package intelligence services when the relevant tool is run:
- OSV API from `get-shit-done/bin/supply_chain_intel.py`
- deps.dev API from `get-shit-done/bin/supply_chain_intel.py`
- GitHub Advisory GraphQL references in `get-shit-done/bin/supply_chain_intel.py`

These are not used by normal install or basic workflow execution. They are used by security scan workflows when invoked.

## Optional External CLI Tools

Security workflows integrate with optional local CLIs when available:
- Semgrep for `get-shit-done/semgrep/threat-patterns.yml`
- Gitleaks for secret scanning
- Trivy and other dependency/IaC scanners through the prescan registry
- Syft or CycloneDX CLI for SBOM generation
- Python 3 for scanner helpers
- Bash for shell shims

The workflows are designed to degrade gracefully when optional tools are missing by passing available structured findings to scanner agents.

## GitHub Integrations

GitHub Actions workflows are under `.github/workflows/`:
- `test.yml`
- `install-smoke.yml`
- `security-scan.yml`
- `release.yml`
- `release-sdk.yml`
- `hotfix.yml`
- `canary.yml`
- `pr-gate.yml`
- `changeset-required.yml`
- `require-issue-link.yml`
- `branch-naming.yml`
- `branch-cleanup.yml`
- `auto-branch.yml`
- `auto-label-issues.yml`
- `stale.yml`
- `close-draft-prs.yml`
- `dismiss-unauthorized-pr-approvals.yml`
- `pr-template-format.yml`

CI validates Node 22/24 compatibility, installer behavior, security scans, and release mechanics.

## Webhooks

The product itself does not expose incoming webhooks. It installs local files, reads project state, and delegates execution to the active AI runtime. Outbound network activity is limited to update checks, package manager operations, and explicit security intelligence workflows.

---

*Integration audit refreshed: 2026-05-13*
