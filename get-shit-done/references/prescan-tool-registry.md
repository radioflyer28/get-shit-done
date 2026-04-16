# Pre-Scan Tool Registry

This document defines the tool registry for the security pre-scan orchestrator. Each tool is defined with its runtime requirements, invocation command, and output parsing strategy.

## Overview

The pre-scan orchestrator runs the following categories of tools:
- **Dependency Scanners** (5+): Detect known vulnerabilities in dependencies
- **Secret Scanners** (3+): Find exposed secrets, API keys, credentials
- **SAST Tools** (4+): Static analysis for code quality and security issues
- **IaC Scanners** (4+): Infrastructure as Code validation
- **Binary/IOC Analysis** (3+): Low-level binary inspection and IOC checking

---

## Dependency Scanners

### npm audit
- **Type:** dep-scanner
- **Runtime:** Node.js (npm, yarn, pnpm)
- **Command:** `npm audit --json`
- **Required Files:** `package.json`, `package-lock.json` (or `yarn.lock`, `pnpm-lock.yaml`)
- **Output Format:** JSON with vulnerabilities object
- **Severity Mapping:** npm severities (critical, high, moderate, low) → normalized (critical, high, medium, low)
- **False Positive Rate:** ~5% (mostly due to dependency chains)
- **Execution Time:** 2–5 seconds (depends on dependency tree size)
- **Notes:** Includes both direct and transitive dependencies; requires package-lock.json for reproducibility

### pip-audit
- **Type:** dep-scanner
- **Runtime:** Python
- **Command:** `pip-audit --desc --format json`
- **Required Files:** `requirements.txt` OR `setup.py` OR `pyproject.toml`
- **Output Format:** JSON with vulnerabilities array
- **Severity Mapping:** OSV severities → normalized
- **False Positive Rate:** ~8% (mostly severity misclassification)
- **Execution Time:** 3–8 seconds
- **Notes:** Checks Python.org advisory database; requires pip >= 23.0

### cargo audit
- **Type:** dep-scanner
- **Runtime:** Rust
- **Command:** `cargo audit --json`
- **Required Files:** `Cargo.toml`, `Cargo.lock`
- **Output Format:** JSON with vulnerabilities array
- **Severity Mapping:** CVSS score → normalized
- **False Positive Rate:** ~2% (highly accurate)
- **Execution Time:** 1–3 seconds
- **Notes:** Checks Rust Security Advisory Database; very reliable

### trivy
- **Type:** dep-scanner (multi-format)
- **Runtime:** All (container images, binaries, source code)
- **Command:** `trivy image <image>` or `trivy fs .`
- **Required Files:** Dockerfile, image metadata, or source tree
- **Output Format:** JSON with Results array
- **Severity Mapping:** CVSS scores → normalized
- **False Positive Rate:** ~12% (prone to dependency misidentification in containers)
- **Execution Time:** 5–15 seconds (depends on image size)
- **Notes:** Excellent for container scanning; uses multiple DBs (Trivy, NVD)

### osv-scanner
- **Type:** dep-scanner (open-source focus)
- **Runtime:** All (multiple package managers)
- **Command:** `osv-scanner -r .`
- **Required Files:** Lockfiles (npm, pip, Cargo, etc.)
- **Output Format:** JSON with vulnerabilities array
- **Severity Mapping:** OSV database severities → normalized
- **False Positive Rate:** ~10% (newer scanner, fewer FP than commercial tools)
- **Execution Time:** 2–6 seconds
- **Notes:** Google-maintained; focuses on open-source vulnerabilities

---

## Secret Scanners

### gitleaks
- **Type:** secret-scanner
- **Runtime:** All (requires .git directory)
- **Command:** `gitleaks detect --report-path /tmp/gitleaks.json --verbose`
- **Required Files:** `.git/` directory
- **Output Format:** JSON with Leaks array
- **Detection Patterns:** 80+ built-in patterns (API keys, tokens, credentials, private keys)
- **False Positive Rate:** ~15% (high FP due to overly broad patterns; requires triage)
- **Execution Time:** 5–30 seconds (depends on git history depth)
- **Notes:** Git history scanning; can find historical secrets; CPU-intensive

### trufflehog
- **Type:** secret-scanner
- **Runtime:** All
- **Command:** `trufflehog filesystem . --json`
- **Required Files:** None (filesystem scan)
- **Output Format:** JSON with Results array
- **Detection Patterns:** Entropy detection, regex patterns, model-based detection
- **False Positive Rate:** ~20% (entropy-based detection prone to FP)
- **Execution Time:** 2–10 seconds
- **Notes:** Filesystem and git scanning; supports multiple backends (GitHub, GitLab, GCP, etc.)

### detect-secrets
- **Type:** secret-scanner
- **Runtime:** All
- **Command:** `detect-secrets scan . --all-files --baseline .secrets.baseline`
- **Required Files:** None
- **Output Format:** JSON with results array
- **Detection Patterns:** Regex and entropy-based
- **False Positive Rate:** ~18% (better than trufflehog for custom patterns)
- **Execution Time:** 1–5 seconds
- **Notes:** Can use baseline files to suppress known FP; integrates with git hooks

---

## SAST Tools

### semgrep
- **Type:** sast
- **Runtime:** All (Python, Go, JavaScript, TypeScript, Java, C, C++, C#, Ruby)
- **Command:** `semgrep --json .`
- **Required Files:** Source files (*.py, *.go, *.js, *.ts, etc.)
- **Output Format:** JSON with results array
- **Pattern Coverage:** 1500+ built-in rules (OWASP, CWE-mapped)
- **False Positive Rate:** ~7% (well-maintained rules)
- **Execution Time:** 5–20 seconds
- **Notes:** Fast, customizable rules; community rule library available

### bandit
- **Type:** sast
- **Runtime:** Python
- **Command:** `bandit -r . -f json`
- **Required Files:** `*.py` files
- **Output Format:** JSON with results array
- **Pattern Coverage:** 90+ built-in checks (hardcoded secrets, insecure functions, etc.)
- **False Positive Rate:** ~10% (prone to FP on security-by-design patterns)
- **Execution Time:** 2–8 seconds
- **Notes:** Python-specific; detects common security issues (SQL injection, weak cryptography, etc.)

### gosec
- **Type:** sast
- **Runtime:** Go
- **Command:** `gosec -json ./...`
- **Required Files:** `*.go` files
- **Output Format:** JSON with Results array
- **Pattern Coverage:** 60+ rules (Go-specific security issues)
- **False Positive Rate:** ~5% (Go toolchain is very reliable)
- **Execution Time:** 1–4 seconds
- **Notes:** Excellent precision for Go; integrated with Go analyzer framework

### eslint-plugin-security
- **Type:** sast
- **Runtime:** JavaScript/TypeScript
- **Command:** `eslint --format json --plugin security .`
- **Required Files:** `*.js`, `*.ts` files
- **Output Format:** JSON with ESLint results
- **Pattern Coverage:** 20+ rules (DOM manipulation, eval, insecure randomness, etc.)
- **False Positive Rate:** ~8%
- **Execution Time:** 3–10 seconds
- **Notes:** Part of ESLint ecosystem; requires Node.js and dependencies

---

## IaC Scanners

### hadolint
- **Type:** iac
- **Runtime:** All (Dockerfile analysis)
- **Command:** `hadolint --format json Dockerfile`
- **Required Files:** `Dockerfile`
- **Output Format:** JSON with results array
- **Rule Coverage:** 60+ rules (security best practices, build optimization)
- **False Positive Rate:** ~3% (very reliable)
- **Execution Time:** <1 second (fast)
- **Notes:** Dockerfile linter; checks for security issues, performance problems, best practices

### checkov
- **Type:** iac
- **Runtime:** All (Terraform, CloudFormation, Kubernetes, Docker)
- **Command:** `checkov -d . --framework all --output json`
- **Required Files:** `*.tf`, `*.yaml`, `*.yml`, `Dockerfile`, etc.
- **Output Format:** JSON with check_type, results arrays
- **Rule Coverage:** 1000+ checks across multiple frameworks
- **False Positive Rate:** ~12% (framework-specific FP rates vary)
- **Execution Time:** 10–30 seconds (comprehensive but slow)
- **Notes:** Comprehensive IaC scanner; requires multiple tool integrations

### tfsec
- **Type:** iac
- **Runtime:** Terraform
- **Command:** `tfsec . -f json`
- **Required Files:** `*.tf` files
- **Output Format:** JSON with results array
- **Rule Coverage:** 200+ Terraform-specific rules
- **False Positive Rate:** ~6%
- **Execution Time:** 2–8 seconds
- **Notes:** Terraform-focused; good for AWS, GCP, Azure configurations

### kube-linter
- **Type:** iac
- **Runtime:** Kubernetes
- **Command:** `kube-linter lint . --format json`
- **Required Files:** `*.yaml`, `*.yml` (Kubernetes manifests)
- **Output Format:** JSON with Reports array
- **Rule Coverage:** 50+ Kubernetes-specific checks
- **False Positive Rate:** ~4%
- **Execution Time:** 1–3 seconds
- **Notes:** Kubernetes manifest linter; checks for security, best practices

---

## Binary & IOC Analysis

### file
- **Type:** binary-analysis
- **Runtime:** All
- **Command:** `file -b --mime <binary>`
- **Output Format:** Plain text (parsed to JSON)
- **Purpose:** Determine binary type, compression, architecture
- **False Positive Rate:** ~2%
- **Execution Time:** <100ms per file

### strings
- **Type:** binary-analysis
- **Runtime:** All
- **Command:** `strings <binary> | grep -E "(http|ftp|ssh|password|key|token)"`
- **Output Format:** Filtered string list (parsed to JSON)
- **Purpose:** Extract readable strings, look for embedded endpoints/credentials
- **False Positive Rate:** ~5% (context-dependent)
- **Execution Time:** 1–5 seconds per binary

### sha256sum
- **Type:** binary-analysis (integrity checking)
- **Runtime:** All
- **Command:** `sha256sum <binary>`
- **Output Format:** Hex digest + filename
- **Purpose:** Generate integrity hashes, compare against known repositories
- **Execution Time:** <1 second per file

---

## PRE-SCAN-RESULTS.json Schema

### Complete Schema Definition

```json
{
  "scan_metadata": {
    "scan_id": "uuid-string (unique identifier for this scan)",
    "timestamp": "ISO-8601 timestamp (when scan started)",
    "target_directory": "absolute path to scanned directory",
    "runtime_detected": "node|python|go|rust|iac|mixed|unknown",
    "scan_duration_ms": "milliseconds from start to completion",
    "scanner_version": "pre-scan orchestrator version"
  },
  
  "tools_executed": [
    {
      "tool_name": "npm audit",
      "tool_type": "dep-scanner",
      "runtime_filter": "node",
      "execution_order": 1,
      "start_time": "ISO-8601",
      "end_time": "ISO-8601",
      "exit_code": 0,
      "execution_time_ms": 1234,
      "errors": [],
      "warnings": [],
      "findings_count": 5,
      "raw_output_size_bytes": 5432,
      "output_truncated": false
    }
  ],
  
  "findings": [
    {
      "id": "unique finding ID (tool_name-index)",
      "tool": "npm audit",
      "tool_type": "dep-scanner",
      "type": "vulnerability",
      "severity": "critical|high|medium|low",
      "title": "Human-readable issue title",
      "description": "Detailed description of the issue",
      "affected_package": "lodash",
      "package_version": "4.17.16",
      "version_range": "<4.17.17",
      "cve": "CVE-2021-23337",
      "cwe": "CWE-1321",
      "cvss_score": 6.5,
      "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N",
      "file_path": "package.json",
      "line_number": null,
      "column_number": null,
      "remediation": "Upgrade lodash to >=4.17.17",
      "remediation_available": true,
      "remediation_version": "4.17.21",
      "references": [
        {
          "title": "Lodash 4.17.21 Release",
          "url": "https://github.com/lodash/lodash/releases/tag/4.17.21"
        }
      ],
      "false_positive_likelihood": "low|medium|high",
      "false_positive_reason": "null or string explaining why this might be a false positive",
      "category": "dependency|code|infrastructure|secret|configuration",
      "impact": "Attackers can execute arbitrary code via prototype pollution",
      "affected_components": ["lodash"],
      "evidence": "package-lock.json contains lodash@4.17.16"
    },
    {
      "id": "gitleaks-001",
      "tool": "gitleaks",
      "tool_type": "secret-scanner",
      "type": "secret",
      "severity": "critical",
      "title": "AWS Access Key ID found",
      "description": "AWS access key pattern detected in git history",
      "secret_type": "aws_access_key",
      "file_path": "src/config.js",
      "line_number": 42,
      "commit_hash": "abc1234def5678",
      "commit_date": "2023-01-15T10:30:00Z",
      "matched_string": "AKIAIOSFODNN7EXAMPLE",
      "remediation": "Rotate AWS access key immediately and remove from git history",
      "references": [],
      "false_positive_likelihood": "low",
      "category": "secret",
      "urgency": "critical"
    }
  ],
  
  "summary": {
    "total_findings": 42,
    "total_tools_attempted": 10,
    "total_tools_executed": 9,
    "total_tools_failed": 1,
    "execution_time_total_ms": 8500,
    
    "by_severity": {
      "critical": 2,
      "high": 8,
      "medium": 20,
      "low": 12
    },
    
    "by_type": {
      "vulnerability": 30,
      "secret": 5,
      "code_issue": 4,
      "infrastructure": 2,
      "configuration": 1
    },
    
    "by_tool": {
      "npm audit": 5,
      "semgrep": 15,
      "gitleaks": 3,
      "trufflehog": 2,
      "bandit": 12,
      "checkov": 8
    },
    
    "by_category": {
      "dependency": 27,
      "code": 8,
      "infrastructure": 4,
      "secret": 3
    },
    
    "tools_executed_successfully": [
      "npm audit",
      "semgrep",
      "gitleaks",
      "bandit",
      "checkov"
    ],
    
    "tools_skipped": [
      {
        "tool_name": "cargo audit",
        "reason": "No Cargo.toml found"
      }
    ],
    
    "tools_failed": [
      {
        "tool_name": "trufflehog",
        "exit_code": 127,
        "error": "Command not found"
      }
    ],
    
    "critical_actions_required": [
      "Rotate AWS credentials (gitleaks-001)",
      "Upgrade lodash to >=4.17.17 (npm-001)"
    ]
  },
  
  "quality_metrics": {
    "deterministic_run": true,
    "repeat_scan_hash": "sha256-of-findings",
    "scans_since_baseline": 1,
    "trends": {
      "new_findings": 3,
      "resolved_findings": 1,
      "unchanged_findings": 38
    },
    "tool_accuracy_scores": {
      "npm audit": 0.95,
      "semgrep": 0.88,
      "gitleaks": 0.82
    }
  },
  
  "notes": "Pre-scan completed successfully. 42 findings across 6 tools. Recommend immediate attention to critical issues.",
  "next_steps": [
    "Review critical findings manually",
    "Rotate exposed credentials",
    "Update dependencies with available patches"
  ]
}
```

### Schema Rationale

1. **scan_metadata:** Unique identification and reproducibility tracking
2. **tools_executed:** Execution audit trail and performance metrics
3. **findings:** Normalized structure allowing agent analysis without tool-specific parsing
4. **summary:** Aggregated statistics for quick overview and trend detection
5. **quality_metrics:** Determinism verification and tool accuracy scores
6. **next_steps:** Actionable recommendations for remediation priority

### Determinism Guarantees

Pre-scan results are deterministic when:
- Same target directory
- Same runtime environment (Node version, Python version, etc.)
- Same set of installed tools
- Same tool versions

To verify determinism:
```bash
bash security-prescan.sh /path/to/repo > scan1.json
bash security-prescan.sh /path/to/repo > scan2.json
jq -S . scan1.json | sha256sum > hash1.txt
jq -S . scan2.json | sha256sum > hash2.txt
diff hash1.txt hash2.txt  # Should be identical
```

---

## Tool Integration Example

The Python orchestrator loads this registry and:

1. Parses tool configurations
2. Filters by detected runtime (Node.js, Python, Go, etc.)
3. Checks tool availability (command in PATH)
4. Executes applicable tools in parallel
5. Normalizes raw output to unified schema
6. Writes PRE-SCAN-RESULTS.json

**Example execution:** On a Node.js + Python monorepo:
- Detect: node, python, iac
- Filter tools: npm audit, pip-audit, semgrep, bandit, gitleaks, trufflehog, checkov, hadolint
- Execute in parallel (max 8 workers)
- Aggregate results into schema
- Output: 8500ms total (parallel execution is 5x faster than sequential)
