---
id: SEED-001
status: dormant
planted: 2026-04-14
planted_during: pre-project (no milestone yet)
trigger_when: when improving security scanner performance, adding multi-ecosystem coverage, or when scanner agent costs become noticeable
scope: Large
---

# SEED-001: Pre-Scan Script Architecture — Hybrid Bash/Python Orchestrator

## Why This Matters

Currently `gsd-security-scanner` and `gsd-threat-scanner` ask the agent to do all mechanical
scanning work — grepping files, detecting patterns, running tool checks. This is slow, expensive,
and less exhaustive than purpose-built tools.

A deterministic pre-scan layer (bash shim → Python orchestrator) would offload ~60% of
mechanical work before the agent ever starts. The agent shifts from "scan everything" to
"analyze structured findings + add business logic reasoning." Result: faster scans, cheaper
token usage, more exhaustive coverage (tools like `semgrep`, `trivy`, `gitleaks` catch far
more than an LLM grepping manually), and reproducible findings that don't vary by model.

## When to Surface

**Trigger:** When we start a milestone focused on improving scanner quality, reducing scan
costs, or adding multi-language security analysis support.

This seed should be presented during `/gsd-new-milestone` when the milestone scope matches
any of these conditions:
- Milestone involves improving `/gsd-security-audit` or `/gsd-threat-scan` capabilities
- Milestone involves reducing AI agent token costs
- Milestone adds support for additional languages/ecosystems in security scanning
- Milestone adds CI/CD integration for the scanner tools

## Scope Estimate

**Large** — This is a full milestone or major phase. Includes:
- Bash shim: `get-shit-done/bin/security-prescan.sh` (~30 lines, runner detection)
- Python orchestrator: `get-shit-done/bin/security_prescan.py` (stdlib only, parallel execution via `concurrent.futures.ProcessPoolExecutor`)
- Unified `PRE-SCAN-RESULTS.json` schema with tool metadata + normalized findings
- Tool registry covering: dep scanners (pip-audit, npm audit, cargo audit, trivy, osv-scanner), secret scanners (gitleaks, trufflehog, detect-secrets), SAST (semgrep, bandit, gosec, eslint-plugin-security), IaC (hadolint, checkov, tfsec, kube-linter), binary/IOC (file, strings, sha256sum)
- Workflow updates for `security-audit.md` and `threat-scan.md` (add pre-scan step, pass `<tool_findings>` to agent)
- Agent prompt updates for `gsd-security-scanner.md` and `gsd-threat-scanner.md` (shift from "scan everything" to "analyze findings + add business logic + triage false positives")

## Breadcrumbs

Related code and decisions found in the current codebase:

- `agents/gsd-security-scanner.md` — current scanner agent (role shifts when pre-scan lands)
- `agents/gsd-threat-scanner.md` — threat scanner agent (same shift; must never execute target code — all pre-scan tools are static analysis only)
- `get-shit-done/workflows/security-audit.md` — workflow that spawns the scanner; pre-scan step inserts between `compute_file_scope` and `spawn_scanner`
- `get-shit-done/workflows/threat-scan.md` — threat scan workflow; same insertion point
- `get-shit-done/bin/lib/security.cjs` — existing security utilities in the bin layer
- `get-shit-done/SECURITY-SCANNER-TODO.md` — full detailed spec (sections 1.1–1.8) with tool tables, CLI arg patterns, runner preference order, and JSON output schema

## Notes

Key design decisions already made in the TODO:
- Bash shim handles portability ("can I run?"), Python handles structured data
- Runner preference order: `uvx` → `npx` → `nix run` → direct binary
- Python uses stdlib only (no pip dependencies) for maximum portability
- All tools are static analysis — they never execute target code (critical for threat-scan)
- Exit 0 always from orchestrator; findings are informational, not blockers
- `gsd-threat-scanner` keeps `read-only` Codex sandbox permission — pre-scan tools are static

Runner detection env vars to export from bash:
- `PRESCAN_RUNNERS=uvx,npx,nix` (comma-separated available runners)
- `PRESCAN_TOOLS=trivy,hadolint,...` (comma-separated available binaries)
