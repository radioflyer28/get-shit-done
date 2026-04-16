# v1.1 Requirements: Security & Threat Scanner Tooling

**Milestone:** v1.1 — Security & Threat Scanner Tooling  
**Approved:** 2026-04-16  
**Owner:** GSD Project  
**Status:** Active (defining roadmap)

---

## Overview

Security and threat scanning must be operationalized through deterministic infrastructure (pre-scan orchestrator), language-specific pattern libraries, supply chain analysis, and CI integration. This milestone implements SEED-006 through SEED-010, transforming scanners from manual audit tools into continuous, production-grade security gates.

**Total Requirements:** 22 (15 table stakes, 4 differentiators, 3 future)  
**Estimate:** 5 phases, ~14 plans

---

## Requirements by Category

### ORK: Pre-Scan Orchestration (SEED-006)

**Purpose:** Hybrid bash/Python orchestrator offloads ~60% of mechanical scanning work before agent involvement, reducing costs and improving exhaustiveness.

**Planned requirements:**

- [x] **ORK-01**: Bash shim (`security-prescan.sh`) detects runtime environment (Node, Python, Go, etc.) and invokes Python orchestrator
- [x] **ORK-02**: Python orchestrator (`security_prescan.py`) uses `concurrent.futures.ProcessPoolExecutor` for parallel tool execution
- [x] **ORK-03**: Tool registry covers dep scanners (pip-audit, npm audit, cargo audit, trivy, osv-scanner)
- [x] **ORK-04**: Tool registry covers secret scanners (gitleaks, trufflehog, detect-secrets)
- [x] **ORK-05**: Tool registry covers SAST tools (semgrep, bandit, gosec, eslint-plugin-security)
- [x] **ORK-06**: Tool registry covers IaC scanners (hadolint, checkov, tfsec, kube-linter)
- [x] **ORK-07**: Tool registry covers binary/IOC analysis (file, strings, sha256sum)
- [x] **ORK-08**: Pre-scan produces unified `PRE-SCAN-RESULTS.json` with normalized findings and tool metadata
- [x] **ORK-09**: Workflow integration: `security-audit.md` and `threat-scan.md` accept pre-scan step and pass `<tool_findings>` to agent
- [x] **ORK-10**: Agent prompts for `gsd-security-scanner.md` and `gsd-threat-scanner.md` shift from "scan everything" to "analyze findings + reason about business logic + triage false positives"

### SEC: Security Reference Sub-Skills (SEED-007)

**Purpose:** Evolve static markdown references into executable sub-skills with language-specific grep/semgrep patterns for precision vulnerability detection.

**Planned requirements:**

- [x] **SEC-01**: Create language-specific sub-skills: Python, JavaScript/TypeScript, Go, Rust, Java, C/C++, PHP
- [x] **SEC-02**: Each sub-skill includes OWASP Top 10 patterns translated into semgrep rules
- [x] **SEC-03**: Sub-skills embed executable grep patterns for each language's idiomatic vulnerability signatures
- [x] **SEC-04**: Sub-skill definitions can be invoked by pre-scan orchestrator and fed to agent with structured findings
- [x] **SEC-05**: Semgrep rules reference community sources (semgrep.dev) with version pins for reproducibility

### THR: Adversarial Pattern Library (SEED-008)

**Purpose:** Dedicated semgrep ruleset for detecting deliberately malicious code (C2 beacons, obfuscated shells, logic bombs, supply chain hooks).

**Planned requirements:**

- [x] **THR-01**: Create `threat-patterns.yml` semgrep ruleset covering obfuscated reverse shells
- [x] **THR-02**: Add C2 beacon detection (HTTP callbacks, DNS exfiltration patterns)
- [x] **THR-03**: Add supply chain hook patterns (telemetry masquerading, installer post-install hooks)
- [x] **THR-04**: Add logic bomb detection (time-based triggers, doomsday clauses)
- [x] **THR-05**: Add language-specific adversarial patterns to reference sub-skills ("Threat Scan Patterns" sections)

### FOR: Git Forensics (SEED-009)

**Purpose:** First-class deep-dive agent/workflow for supply chain attack detection through commit history, binary objects, and author analysis.

**Planned requirements:**

- [x] **FOR-01**: Git forensics analyzes commit history beyond surface-level commands (git log, reflog, branches)
- [x] **FOR-02**: Detects binary blobs lingering in git object database
- [x] **FOR-03**: Detects history rewrites and force-pushes via reflog analysis
- [x] **FOR-04**: Analyzes `.gitattributes` smudge/clean filters for code execution vectors
- [x] **FOR-05**: Detects author consistency anomalies (email/key mismatches, timezone/activity bursts, one-time critical contributors)
- [x] **FOR-06**: Produces `GIT-FORENSICS.md` report with actionable findings
- [x] **FOR-07**: Git forensics gate can be invoked standalone or integrated into threat scan workflow

### OPS: Scanner Operational Excellence (SEED-010)

**Purpose:** CI integration, baseline mode, supply chain intelligence, formalized quarantine, and SBOM generation for production-grade automated scanning.

**Planned requirements:**

- [x] **OPS-01**: CI mode for scanning on lockfile changes (package.json, requirements.txt, Gemfile, etc.)
- [x] **OPS-02**: Baseline file (detect-secrets style) allows "previously reviewed, still present" state to reduce noise
- [x] **OPS-03**: Supply chain intelligence: Read-only APIs (OSV, deps.dev, GitHub Advisory) for package reputation pre-install
- [x] **OPS-04**: Quarantine workflow: Formal protocol for flagged files (location, report format, release procedure)
- [x] **OPS-05**: SBOM generation via `syft`/`cyclonedx-cli` for known-inventory tracking
- [x] **OPS-06**: Scan state tracking (baseline ID, previous scan results, delta reporting)
- [x] **OPS-07**: `/gsd-security-audit --ci` mode for automated pipelines
- [x] **OPS-08**: `/gsd-threat-scan --ci` mode with deterministic output format

---

## Traceability

| Requirement | Category | Seeds | Phase |
|-------------|----------|-------|-------|
| ORK-01 through ORK-10 | Pre-Scan Orchestration | SEED-006 | Phase 1 |
| SEC-01 through SEC-05 | Security Patterns | SEED-007 | Phase 2 |
| THR-01 through THR-05 | Threat Patterns | SEED-008 | Phase 3 |
| FOR-01 through FOR-07 | Git Forensics | SEED-009 | Phase 4 |
| OPS-01 through OPS-08 | Operational Excellence | SEED-010 | Phase 5 |

---

## Success Criteria

**v1.1 is complete when:**

1. ✅ Pre-scan orchestrator (ORK) is production-ready and reduces agent token usage by 50%+ on typical scans
2. ✅ Security and threat pattern libraries (SEC, THR) enable deterministic, reproducible scanning
3. ✅ Git forensics (FOR) catches supply chain attacks missed by surface-level analysis
4. ✅ Operational modes (OPS) allow seamless CI integration with baseline/quarantine support
5. ✅ All 22 requirements satisfied with 60+ integration tests passing
6. ✅ Cross-phase integration: Pre-scan → Pattern matching → Forensics → Agent reasoning → Operational output

---

## Dependency Notes

- **ORK is foundational:** SEC, THR, FOR all depend on ORK's `PRE-SCAN-RESULTS.json` schema
- **SEC and THR are parallel:** Both pattern libraries feed into pre-scan tool registry (ORK step 3-7)
- **FOR builds on ORK:** Adds git-specific analysis after pre-scan
- **OPS aggregates:** Bundles ORK+SEC+THR+FOR with CI, baseline, and quarantine infrastructure

---

## Future Work (v1.2+)

- [ ] External SBOM repository integration
- [ ] Telemetry-driven pattern quality scoring
- [ ] Automated remediation suggestions (not just detection)
- [ ] Multi-repo scanning orchestration
- [ ] Historical trend analysis and anomaly detection

---

## Out of Scope (v1.1)

- Autonomous scanner improvement (SEED-004) — Requires v1.1 manual infrastructure to stabilize first
- Skill marketplace — Separate concern from scanner tooling
- Real-time monitoring dashboards — Covered in v1.2 with telemetry backend

---

**Defined:** 2026-04-16  
**Owner:** GSD Project  
**Next Step:** Roadmap creation (Phase numbering and task breakdown)

### Ecosystem

- **ECO-01**: Skill marketplace or registry for sharing skills
- **ECO-02**: `--full` flag for scaffolder to generate complete working skills (not just stubs)
- **ECO-03**: Skill versioning and changelog tracking
- **ECO-04**: Multi-skill batch auditing mode for quality sweeps and future autonomous tuning pipelines

## Out of Scope

| Feature | Reason |
|---------|--------|
| Autonomous tuning (SEED-004) | Requires manual tuning proven first; Large scope |
| Skill marketplace / registry | No sharing mechanism needed in v1 |
| External contributor onboarding | Build-skill handles creation, not contributor docs |
| Scanner seeds (006-010) | Separate concern, separate milestone |
| Skill versioning | v1 focuses on quality, not change tracking |
| Multi-skill batch auditing | Deferred to v2; Phase 3 focuses on single-skill depth semantics |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| SCAFFOLD-01 | Phase 4 | Pending |
| SCAFFOLD-02 | Phase 4 | Pending |
| SCAFFOLD-03 | Phase 4 | Pending |
| SCAFFOLD-04 | Phase 4 | Pending |
| SCAFFOLD-05 | Phase 4 | Pending |
| SCAFFOLD-06 | Phase 4 | Pending |
| SCAFFOLD-07 | Phase 4 | Pending |
| SCAFFOLD-08 | Phase 4 | Pending |
| AUDIT-01 | Phase 2 | Pending |
| AUDIT-02 | Phase 2 | Pending |
| AUDIT-03 | Phase 2 | Pending |
| AUDIT-04 | Phase 2 | Pending |
| AUDIT-05 | Phase 2 | Pending |
| AUDIT-06 | Phase 2 | Pending |
| AUDIT-07 | Phase 3 | Pending |
| AUDIT-08 | Phase 3 | Pending |
| AUDIT-09 | Phase 3 | Pending |
| AUDIT-10 | Phase 3 | Pending |
| TUNE-01 | Phase 5 | Pending |
| TUNE-02 | Phase 5 | Pending |
| TUNE-03 | Phase 5 | Pending |
| TUNE-04 | Phase 5 | Pending |
| TUNE-05 | Phase 5 | Pending |
| TUNE-06 | Phase 5 | Pending |
| TUNE-07 | Phase 5 | Pending |
| TUNE-08 | Phase 5 | Pending |
| TUNE-09 | Phase 5 | Pending |
| TUNE-10 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2025-04-15*
*Last updated: 2026-04-15 after Phase 3 scope revision*