---
id: SEED-006
status: dormant
planted: 2026-04-14
planted_during: pre-project (no milestone yet)
trigger_when: when improving security scanner performance, adding multi-ecosystem coverage, or when scanner agent costs become noticeable
scope: Large
---

# SEED-006: Pre-Scan Script Architecture — Hybrid Bash/Python Orchestrator

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

**Workflow lifecycle steps (new — mirrors OWASP PTES methodology):**

The pre-scan architecture enables three workflow steps that the current scanners lack. These
transform scanning from "fire and scan everything" into a structured assessment:

1. **`build_threat_model` step** (between recon/pre-scan and agent dispatch):
   - Pre-scan recon produces structured project intelligence: detected stack, frameworks,
     entry points, dependency graph, exposed surfaces
   - Agent assembles a prioritized attack surface map before scanning: *"JWT auth middleware →
     token validation bypass risk; S3 upload handler → path traversal + SSRF; raw SQL in
     legacy module → injection"*
   - Depth-gated behavior:
     - `--depth=quick`: skip entirely (fire-and-forget)
     - `--depth=standard`: lightweight internal step (~10-line scan strategy, no visible latency)
     - `--depth=deep`: full threat model written as a section in the final report; parallel
       dispatch uses it to route high-risk files to dedicated scanner instances
   - For threat scanner: adversarial framing — *"If a sophisticated attacker contributed to
     this repo, where would they hide backdoors? What surfaces enable data exfiltration?"*

2. **`verify_coverage` step** (after scan results merge, before final report):
   - Compares the threat model's attack surface list against actual scan findings
   - Flags uncovered surfaces: *"Threat model identified S3 upload handler as high-risk but
     no findings reference upload or s3 files"*
   - Checks OWASP category coverage: were all applicable categories from the loaded reference
     files actually checked?
   - For threat scanner: verifies all adversarial pattern categories (backdoors, exfil, supply
     chain, osint, obfuscation) were addressed — not just mentioned
   - Produces a **Coverage** section in the final report: surfaces covered, gaps identified,
     confidence level per area
   - Depth-gated: `quick` skips, `standard` produces a compact coverage summary, `deep`
     produces a full gap analysis with remediation suggestions

3. **Web search reconnaissance** (recon phase, **disabled by default**):
   - During recon, the scanner identifies knowledge gaps where current intelligence would
     materially improve scan quality
   - When gaps are significant, the agent **asks the user** rather than silently proceeding
   - `--web-search` flag: pre-approves automatic web search during recon (skips interactive
     prompt)
   - Results included in pre-scan context as `<web_intel>` block for the agent to reason about
   - **Design constraint:** Web search is informational input only — never used to download
     or execute anything. Pure read-only intelligence gathering.

   **Security audit web search** (your code — low privacy risk):
   - Knowledge gaps: dependencies without known CVE data in the agent's training set,
     unfamiliar or niche frameworks where the vulnerability surface is unclear, recently
     published packages (post-training-cutoff) with no reputation signal
   - Query targets: OSV.dev, NVD/CVE databases, framework security documentation, recent
     security advisories for detected dependencies, GitHub Advisory Database
   - Example prompt: *"I detected [framework X] v3.2 but have limited knowledge of its
     vulnerability surface. Web search could provide current CVE data and known attack
     patterns. Approve web search? [y/N]"*
   - Privacy risk: **low** — searching your own stack's CVEs is standard practice; queries
     reveal only package names and versions you chose to use

   **Threat scan web search** (untrusted code — elevated privacy risk):
   - Knowledge gaps: adversarial technique intelligence for the detected stack, supply chain
     attack advisories, typosquatting/dependency confusion reports, maintainer account
     compromise alerts, IOC (Indicators of Compromise) databases, known malware family
     signatures matching binary artifacts found in-repo
   - Query targets: same as above PLUS threat intelligence feeds, ecosystem-specific security
     blogs, npm/PyPI security advisories, known-compromised package lists
   - Example prompt: *"Target contains 3 npm packages not in my training data and 2 binary
     .wasm files. Web search could check for supply chain advisories and IOC matches.
     Note: queries will include package names from the target codebase. Approve? [y/N]"*
   - Privacy risk: **elevated** — queries reveal what's in the untrusted codebase you're
     investigating, which could alert a motivated adversary monitoring search traffic for
     their payload names. The agent must disclose exactly what it plans to search before
     the user approves. Consider whether the threat actor could be monitoring for searches
     against their specific package/binary names.

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

**Scanner purpose context (applies to all pre-scan architecture decisions):**
- **Security audit** (`/gsd-security-audit`): *"How do I make this code more secure?"* —
  improvement-oriented hardening of your own (or someone else's) codebase. The user trusts
  the code's intent; they want to find and fix vulnerabilities before attackers do.
- **Threat scan** (`/gsd-threat-scan`): *"Is this cloned project safe to use? Will it steal
  my keys, install a trojan, or cryptojack me?"* — binary trust gate for brownfield repos
  the user cloned but hasn't vetted. The code's intent itself is in question.
**Layer boundary with SEED-010 (supply chain intel):**
SEED-006 runs *locally installed CLI tools* (`pip-audit`, `npm audit`, `trivy`, etc.) that
scan the filesystem for known vulnerabilities. SEED-010 Phase B queries *remote APIs*
(OSV, deps.dev, GitHub Advisory Database) for reputation data not available locally.
Different execution layer, different dependencies — the pre-scan orchestrator calls tools;
the supply chain intel step calls APIs.