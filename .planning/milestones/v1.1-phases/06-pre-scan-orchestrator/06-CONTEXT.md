# Phase 6: Pre-Scan Orchestrator - Context

**Phase:** 6  
**Milestone:** v1.1 — Security & Threat Scanner Tooling  
**Gathered:** 2026-04-16  
**Status:** Ready for planning  
**Source:** Requirements (ORK-01 to ORK-10), SEEDS-INDEX.md (SEED-006)

---

## Phase Boundary

**What this phase delivers:**

A hybrid bash/Python orchestrator that offloads ~60% of mechanical scanning work before LLM involvement. The pre-scan layer:

- **Bash shim** (`security-prescan.sh`): Detects runtime environment (Node, Python, Go, etc.) and invokes Python orchestrator
- **Python orchestrator** (`security_prescan.py`): Parallel execution of local security tools via `concurrent.futures.ProcessPoolExecutor`
- **Unified schema** (`PRE-SCAN-RESULTS.json`): Normalized findings from all tools with metadata
- **Tool registry**: Comprehensive coverage of dep scanners, secret scanners, SAST, IaC, binary/IOC analysis
- **Workflow integration**: Updates to `security-audit.md` and `threat-scan.md` to accept pre-scan results
- **Agent prompt updates**: Shift `gsd-security-scanner.md` and `gsd-threat-scanner.md` from "scan everything" to "analyze findings + reason + triage false positives"

**Why this matters:** Token cost reduction (50%+), exhaustive coverage via purpose-built tools, reproducible findings (deterministic, not LLM-variance), and consistent baseline for downstream pattern-matching phases.

---

## Implementation Decisions

### Orchestration Strategy

- **Bash entry point** (`security-prescan.sh`): Simple, portable, handles runtime detection
- **Python executor** (`security_prescan.py`): Stdlib only (no external dependencies), `concurrent.futures` for parallelism, structured JSON output
- **Why Python:** Mature standard library, cross-platform, easier tool orchestration than pure bash

### Tool Coverage

#### Dependency Scanners (ORK-03)
- `pip-audit` (Python deps)
- `npm audit` (Node.js deps)
- `cargo audit` (Rust deps)
- `trivy` (OCI images + multi-format)
- `osv-scanner` (open-source vulnerabilities)

#### Secret Scanners (ORK-04)
- `gitleaks` (git history secrets)
- `trufflehog` (broader secret patterns)
- `detect-secrets` (inline secret detection + baseline support)

#### SAST Tools (ORK-05)
- `semgrep` (language-agnostic, AST-aware)
- `bandit` (Python security issues)
- `gosec` (Go security)
- `eslint-plugin-security` (JavaScript/TypeScript security)

#### IaC Scanners (ORK-06)
- `hadolint` (Dockerfile best practices)
- `checkov` (Terraform, CloudFormation, Kubernetes)
- `tfsec` (Terraform security)
- `kube-linter` (Kubernetes manifest linting)

#### Binary/IOC Analysis (ORK-07)
- `file` (binary type identification)
- `strings` (extract readable strings from binaries)
- `sha256sum` (hash-based malware detection via YARA + VirusTotal API integration in Phase 10)

### Output Schema (ORK-08)

`PRE-SCAN-RESULTS.json` includes:

```json
{
  "scan_id": "uuid-string",
  "timestamp": "ISO-8601",
  "tools_run": [
    {
      "tool_name": "npm audit",
      "exit_code": 0,
      "findings_count": 5,
      "execution_time_ms": 1234,
      "findings": [
        {
          "type": "vulnerability",
          "severity": "high",
          "title": "...",
          "affected_package": "...",
          "version_range": "...",
          "cve": "...",
          "remediation": "..."
        }
      ]
    }
  ],
  "summary": {
    "total_findings": 42,
    "by_severity": { "critical": 2, "high": 8, "medium": 20, "low": 12 },
    "execution_time_total_ms": 8500
  }
}
```

### Workflow Integration (ORK-09)

**In `security-audit.md`:**
1. Pre-scan step: Run `./get-shit-done/bin/security-prescan.sh`
2. Pass `<tool_findings>` to agent instead of raw tool invocations
3. Agent focuses on analysis + business logic, not mechanical scanning

**In `threat-scan.md`:**
1. Pre-scan step: Run with threat-specific tool configuration
2. Pass findings to `gsd-threat-scanner` agent
3. Agent reasons about adversarial patterns in context of findings

### Agent Prompt Updates (ORK-10)

**Current behavior:** Agent runs grep, invokes tools, mechanically detects patterns.

**New behavior:** Agent receives structured findings, reasons about:
- False positive triaging (tool reported finding, but is it actually a problem?)
- Business logic impact (is this vulnerability exploitable in this context?)
- Remediation prioritization (what should be fixed first?)
- Adversarial reasoning (does this look like supply chain attack, logic bomb, etc.?)

---

## Specific Ideas

### Performance Target
- Scan completion time < 15 seconds on typical codebases (Node + Python project with ~500 files)
- Token reduction: 50%+ compared to pure LLM scanning

### Parallel Execution
- Python uses `ProcessPoolExecutor` with default worker count (typically `len(cpu_cores)`)
- Configurable via `MAX_WORKERS` env var for resource-constrained environments

### Determinism
- Tool output is normalized to JSON schema before agent sees it
- Same codebase scanned twice produces identical findings (no LLM variance)

### Extensibility
- Tool registry is data-driven (YAML/JSON), not hardcoded
- New tools can be added without modifying orchestrator logic

---

## Deferred Ideas

- **VirusTotal API integration for binary hashing:** Moved to Phase 10 (operational excellence) with broader supply chain intelligence
- **Custom semgrep rules:** Addressed in Phase 8 (threat patterns) as language-specific rules
- **Scan result caching:** Future phase (v1.2) optimization

---

## Requirements Mapping

| Requirement | Artifact / Task | Implementation Detail |
|-------------|-----------------|----------------------|
| ORK-01 | Bash shim | `get-shit-done/bin/security-prescan.sh` — runtime detection + Python invocation |
| ORK-02 | Python orchestrator | `get-shit-done/bin/security_prescan.py` — stdlib, ProcessPoolExecutor |
| ORK-03 | Dep scanners registry | Tool registry covering 5+ dep tools |
| ORK-04 | Secret scanners registry | Tool registry covering 3+ secret tools |
| ORK-05 | SAST registry | Tool registry covering 4+ SAST tools |
| ORK-06 | IaC registry | Tool registry covering 4+ IaC tools |
| ORK-07 | Binary/IOC registry | Tool registry covering file, strings, sha256sum |
| ORK-08 | Unified schema | PRE-SCAN-RESULTS.json with normalized findings + metadata |
| ORK-09 | Workflow integration | Updates to security-audit.md and threat-scan.md |
| ORK-10 | Agent prompt updates | Shift gsd-security-scanner + gsd-threat-scanner to analysis mode |

---

## the Agent's Discretion

- **Tool-specific configuration**: How to invoke each tool (flags, output parsing)
- **Registry format**: Whether to use YAML, JSON, or Python dict for tool registry
- **Error handling strategy**: What to do if a tool fails (skip, retry, warn)
- **Parallelism strategy**: Worker count, timeout per tool
- **Integration order**: Which phase dependencies to prioritize if time-constrained

---

**Context prepared:** 2026-04-16  
**Ready for:** Planner agent (task breakdown, estimates, dependencies)  
**Next:** Phase planning via `/gsd-plan-phase 6`
