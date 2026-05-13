# Technology Stack

**Analysis Date:** 2026-05-13
**Mapped Commit:** `c582682e`

## Runtime & Languages

GSD is a Node.js CLI and prompt/workflow distribution package. The root package is `get-shit-done-cc` at `1.50.0-canary.0`, with `engines.node >=22.0.0` in `package.json`.

Primary languages:
- JavaScript CommonJS for the installer, runtime libraries, hooks, scripts, and most tests: `bin/install.js`, `get-shit-done/bin/lib/*.cjs`, `hooks/*.js`, `scripts/*.cjs`, `tests/*.test.cjs`.
- TypeScript for the SDK package under `sdk/src/**/*.ts`.
- Markdown for the product surface: `agents/*.md`, `commands/gsd/*.md`, `get-shit-done/workflows/*.md`, `get-shit-done/references/**/*.md`, `get-shit-done/templates/*.md`.
- Python and shell for security and scan helpers: `get-shit-done/bin/security_prescan.py`, `get-shit-done/bin/supply_chain_intel.py`, `get-shit-done/bin/scan_baseline.py`, `get-shit-done/bin/*.sh`.
- YAML for GitHub Actions and Semgrep rules: `.github/workflows/*.yml`, `get-shit-done/semgrep/threat-patterns.yml`.

## Packages

Root package:
- `package.json` exposes `get-shit-done-cc`, `gsd-sdk`, and `gsd-tools` bins.
- Runtime dependencies are intentionally small: `@anthropic-ai/claude-agent-sdk` and `ws`.
- Dev dependency `c8` powers coverage for CommonJS library tests.
- `package-lock.json` is the root npm lockfile.

SDK package:
- `sdk/package.json` defines `@gsd-build/sdk`.
- `sdk/src/cli.ts` builds the `gsd-sdk` command.
- SDK dependencies mirror root runtime needs: `@anthropic-ai/claude-agent-sdk`, `ws`.
- SDK dev dependencies include `typescript`, `vitest`, `@types/node`, and `@types/ws`.

## Build & Distribution

Build and publish surface:
- `npm run build:hooks` runs `scripts/build-hooks.js`.
- `npm run build:sdk` runs `cd sdk && npm ci && npm run build`.
- `prepublishOnly` runs hook and SDK builds before npm publication.
- `sdk/dist/` is expected in published installs so `gsd-sdk query ...` works from installed runtimes.
- `get-shit-done/bin/shared/model-catalog.json` is written by installer flows so installed CommonJS libraries can resolve the shared catalog.

The package installs different runtime surfaces from the same source tree. The installer converts or stages files from:
- `agents/`
- `commands/gsd/`
- `get-shit-done/workflows/`
- `get-shit-done/references/`
- `get-shit-done/templates/`
- `sdk/shared/model-catalog.json`

## Runtime Targets

The installer supports multiple AI coding runtimes through CLI flags in `bin/install.js`, including:
- Claude Code: `--claude`
- OpenCode: `--opencode`
- Gemini CLI: `--gemini`
- Kilo Code: `--kilo`
- Codex: `--codex`
- GitHub Copilot: `--copilot`
- Antigravity: `--antigravity`
- Cursor: `--cursor`
- Windsurf: `--windsurf`
- Augment: `--augment`
- Trae: `--trae`
- Qwen Code: `--qwen`
- Hermes Agent: `--hermes`
- Pi: `--pi`
- Cline: `--cline`
- CodeBuddy: `--codebuddy`

Pi support is present in this branch:
- Global Pi home: `~/.pi/agent`
- Local Pi home: `.pi`
- Skills install to `skills/gsd-*/SKILL.md`.
- Agents install to `agents/gsd-*.md` in pi-subagents-compatible frontmatter.
- `pi-subagents` is optional; workflows can fall back to sequential execution.

## Model Catalog

Model routing is centralized in `sdk/shared/model-catalog.json` and loaded by:
- `get-shit-done/bin/lib/model-catalog.cjs`
- `sdk/src/model-catalog.ts`
- `get-shit-done/bin/lib/model-profiles.cjs`
- `sdk/src/query/config-query.ts`

Codex defaults:
- `opus` -> `gpt-5.5` with `reasoning_effort: high`
- `sonnet` -> `gpt-5.3-codex` with `reasoning_effort: medium`
- `haiku` -> `gpt-5.4-mini` with `reasoning_effort: low`

Pi defaults:
- `opus` -> `openai-codex/gpt-5.5` with `thinking: high`
- `sonnet` -> `openai-codex/gpt-5.3-codex` with `thinking: medium`
- `haiku` -> `openai-codex/gpt-5.4-mini` with `thinking: low`

Runtime tier overrides use `model_profile_overrides.<runtime>.<tier>` and can be strings or objects with `model`, `reasoning_effort`, and `thinking`.

## Security Tooling Stack

The security-skills branch adds deterministic scan helpers:
- `get-shit-done/bin/security-prescan.sh`
- `get-shit-done/bin/security_prescan.py`
- `get-shit-done/bin/scan_ci.sh`
- `get-shit-done/bin/scan_baseline.py`
- `get-shit-done/bin/scan_state.py`
- `get-shit-done/bin/sbom_generate.sh`
- `get-shit-done/bin/supply_chain_intel.py`
- `get-shit-done/bin/git_forensics.sh`
- `get-shit-done/bin/git_forensics_report.py`
- `get-shit-done/semgrep/threat-patterns.yml`

These tools are intentionally mostly stdlib shell/Python wrappers around optional external scanners such as Semgrep, Trivy, Gitleaks, Syft, CycloneDX, OSV, deps.dev, and GitHub Advisory data.

## Test Stack

Root tests:
- `node --test` via `scripts/run-tests.cjs`
- Files: `tests/*.test.cjs`
- Current count: 501 CJS test files
- Coverage: `c8` over `get-shit-done/bin/lib/*.cjs`

SDK tests:
- Vitest through `npm --prefix sdk test`
- Files: `sdk/src/**/*.test.ts` and integration tests
- TypeScript build through `tsc`

Representative focused suites for this branch:
- `tests/pi-install.test.cjs`
- `tests/runtime-converters.test.cjs`
- `tests/model-catalog-runtime-defaults.test.cjs`
- `tests/issue-2517-runtime-aware-profiles.test.cjs`
- `tests/phase-06-prescan.test.cjs`
- `tests/phase10-scanner-operations.test.cjs`
- `tests/threat-patterns-validation.test.cjs`
- `sdk/src/query/config-query.test.ts`

## Tooling Gaps

There is no repo-wide formatter or ESLint/Biome config. Style is enforced by tests, conventions, and review. The strongest automated checks are structural tests, installer tests, SDK tests, and security scans.

---

*Stack analysis refreshed: 2026-05-13*
