# External Integrations

**Analysis Date:** 2026-04-14

## Platform Integrations

GSD installs configuration and agent files into AI coding assistant runtimes. The installer (`bin/install.js`) supports the following platforms via CLI flags:

| Flag | Platform |
|------|----------|
| `--claude` | Claude Code (Anthropic) |
| `--opencode` | OpenCode |
| `--gemini` | Gemini CLI (Google) |
| `--kilo` | Kilo Code |
| `--codex` | Codex CLI (OpenAI) |
| `--copilot` | GitHub Copilot |
| `--cursor` | Cursor |
| `--windsurf` | Windsurf |
| `--antigravity` | Antigravity |
| `--augment` | Augment Code |
| `--trae` | Trae |
| `--qwen` | Qwen Code |
| `--codebuddy` | CodeBuddy |
| `--cline` | Cline |

**Tool name mapping:** Claude Code tool names (e.g. `Read`, `Write`, `Bash`) are remapped to GitHub Copilot equivalents (`read`, `edit`, `execute`) during installation. Applies to agents only, not skills.

**Codex agent sandbox config:** The installer writes `config.toml` entries assigning `workspace-write` or `read-only` sandbox levels to named GSD agents.

**Copilot instructions:** The installer manages a `<!-- GSD Configuration -->` block inside `.github/copilot-instructions.md`.

## APIs & External Services

No outbound HTTP API calls in the core library at runtime. GSD is a prompt/config installer — it writes files to disk and delegates execution to the installed AI runtime.

## Package Registries

**Publishes to:**
- npm public registry: `https://registry.npmjs.org`
- Package: `get-shit-done-cc` (public, with provenance)
- Installation: `npx get-shit-done-cc@latest`

**Consumes from:**
- npm (standard `npm ci` for dev dependencies)

**Auth:** `NODE_AUTH_TOKEN` secret used in release/hotfix workflows for `npm publish`

## CI/CD

**Platform:** GitHub Actions

**Repository:** `gsd-build/get-shit-done`

**Workflows:**

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `test.yml` | push to `main`/`release/**`/`hotfix/**`, PR to `main` | Run tests on Node 22+24 (ubuntu), Node 24 (macOS) |
| `release.yml` | `workflow_dispatch` | Manage minor/major release lifecycle (create → RC → finalize → `npm publish`) |
| `hotfix.yml` | `workflow_dispatch` | Patch release pipeline with `npm publish` |
| `security-scan.yml` | PR to `main`/`release/**`/`hotfix/**` | Prompt injection, base64 obfuscation, secret, and `.planning/` leakage scans |
| `pr-gate.yml` | PR | General PR quality gate |
| `require-issue-link.yml` | PR | Enforces issue link in PRs |
| `branch-naming.yml` | PR | Enforces branch naming conventions |
| `branch-cleanup.yml` | Scheduled/merge | Deletes stale branches |
| `stale.yml` | Scheduled | Marks/closes stale issues and PRs |
| `auto-label-issues.yml` | Issue opened | Auto-labels new issues |
| `auto-branch.yml` | Issue labeled | Creates branch from issue |
| `close-draft-prs.yml` | Scheduled | Closes lingering draft PRs |

**Pinned action versions:** All `actions/checkout` and `actions/setup-node` calls use pinned SHA hashes (supply-chain security practice).

## Webhooks & Callbacks

**Incoming:** None
**Outgoing:** None

---

*Integration audit: 2026-04-14*
