# GSD Project

## What This Is

GSD is a meta-prompting framework for AI agents — tools, workflows, and skills that enable coordinated multi-agent work on complex software projects. This project builds three primary capability areas:

1. **Skill Lifecycle Tooling** (v1.0 ✅) — Create, audit, and tune skills through guided workflows
2. **Security & Threat Scanner Tooling** (v1.1 ✅) — Deterministic pre-scan orchestrator, reference-based pattern matching, git forensics, and operational CI integration
3. **Autonomous Skills & Ecosystem** (v2.0 🔮) — Autoresearch-driven improvement, marketplace, and external integrations

## Core Values

- **Quality by design:** Every GSD skill meets a consistent quality bar (SMART-compliant, structurally sound, improvable)
- **Security first:** Code auditing and threat detection are built-in, not bolted-on
- **Operational readiness:** Tools integrate into CI, dashboards, and production workflows

## Current State: v1.1 Shipped (2026-04-16)

✅ **All v1.1 features shipped and validated (2026-04-16)**

Security and threat scanning is now production-grade:

- ✅ Pre-scan orchestrator (`security-prescan.sh` + `security_prescan.py`) — Hybrid bash/Python offloads ~60% of mechanical scanning (SEED-006)
- ✅ 7 language pattern files with OWASP Top 10 + executable semgrep/grep rules (SEED-007)
- ✅ 25-rule adversarial semgrep library — backdoor, exfil, supply_chain, logic_bomb, obfuscation, osint (SEED-008)
- ✅ Git forensics engine — binary blob detection, reflog analysis, author anomalies, `.gitattributes` inspection (SEED-009)
- ✅ Operational stack — CI mode, baseline management, supply chain intelligence (OSV/deps.dev/GitHub Advisory), SBOM generation, quarantine protocol (SEED-010)

**Metrics:**
- 5 phases, 8 plans, 22/22 requirements satisfied
- ~237 new integration tests
- Shipped: 2026-04-16

## Next Milestone: v1.2 (Planning)

**Goal:** Performance optimization and autonomous foundation research

**Target features (TBD):**
- Autonomous skill tuning research (SEED-004)
- External SBOM repository integration
- Multi-repo scanning orchestration
- Telemetry-driven pattern quality scoring

## Requirements

### Validated

- ✓ Guided skill scaffolding via `/gsd-build-skill` (SEED-001) — v1.0
- ✓ Skill quality auditing via `/gsd-audit-skill` (SEED-003) — v1.0
- ✓ Human-in-the-loop skill tuning via `/gsd-tune-skill` (SEED-002) — v1.0
- ✓ Shared SMART criteria rubric (`references/skill-smart-criteria.md`) — v1.0
- ✓ Pre-scan orchestrator (bash/Python hybrid) (SEED-006) — v1.1
- ✓ Security reference sub-skills — executable patterns (SEED-007) — v1.1
- ✓ Adversarial pattern library — threat detection semgrep rules (SEED-008) — v1.1
- ✓ Git forensics agent — supply chain analysis (SEED-009) — v1.1
- ✓ Scanner operational excellence — CI, baselines, quarantine, SBOM (SEED-010) — v1.1

### Active (v1.2 Planning)

- [ ] Autonomous skill tuning (SEED-004) — research phase
- [ ] External SBOM repository integration
- [ ] Multi-repo scanning orchestration

### Future (v2.0+)

- [ ] Skill marketplace and registry
- [ ] Performance optimization for large scale operations
- [ ] Autonomous scanner improvement driven by telemetry

### Out of Scope

- Autonomous scanner improvement in v1.x — focus on deterministic infrastructure first
- Supply chain intelligence beyond API integration — external dependency tracking in v1.2
- Real-time monitoring dashboards — covered in v1.2+ with telemetry backend

## Context

- **v1.0 (shipped):** Built skill lifecycle tooling (build/audit/tune) — 5 phases, 13 plans
- **v1.1 (shipped):** Security & threat scanning infrastructure — 5 phases, 8 plans, ~237 tests
- **v1.2 (next):** Performance and autonomous research foundation
- **Scanner architecture:** Pre-scan → Pattern matching → Forensics → Agent reasoning → Operational output
- **Design principle:** Agents reason about findings, tools do the mechanical scanning

## Constraints

- **Determinism required:** Pre-scan output must be reproducible — no LLM variance in mechanical scans
- **Tool coverage:** Support major ecosystems (Node/npm, Python/pip, Go, Rust, etc.) and scan types (deps, secrets, SAST, IaC, binary)
- **Token efficiency:** Offload 60%+ of mechanical work from LLM to local tools before agent sees data
- **Backward compatibility:** Don't break existing `/gsd-security-audit` and `/gsd-threat-scan` — extend them with pre-scan layer
- **Operational readiness:** CI integration, baseline management, and quarantine workflows must be production-grade from day one

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pre-scan orchestrator as v1.1 foundation | Solves token cost and coverage problems holistically | ✓ Shipped — significant agent cost reduction |
| Deterministic infrastructure over LLM variance | Mechanical scanning must be reproducible | ✓ All scans produce identical outputs for same input |
| Semgrep + community rules | Leverage battle-tested, maintained ruleset rather than hand-crafted patterns | ✓ 25 adversarial + 27 OWASP rules from semgrep.dev |
| Git forensics as first-class gate | Supply chain attacks require deep history analysis that surface-level git commands miss | ✓ Shipped — reflog, binary blob, author anomaly detection |
| XML isolation tags for commit data | Prevent prompt injection when GIT-FORENSICS.md passed to AI agent | ✓ All forensics output wrapped in isolation tags |
| Operational model (CI, baselines, quarantine) | Make scanning safe for automated pipelines, not just manual audits | ✓ Shipped — CI mode, baselines, SBOM, quarantine |
| stdlib-only for orchestrator and pattern loader | No external deps for security infrastructure | ✓ Zero new npm/pip dependencies added |

---
*Last updated: 2026-04-16 after v1.1 milestone*


## Core Values

- **Quality by design:** Every GSD skill meets a consistent quality bar (SMART-compliant, structurally sound, improvable)
- **Security first:** Code auditing and threat detection are built-in, not bolted-on
- **Operational readiness:** Tools integrate into CI, dashboards, and production workflows

## Current Milestone: v1.1 — Security & Threat Scanner Tooling

**Goal:** Operationalize code security and threat scanning through deterministic pre-scan orchestration, language-specific pattern libraries, and CI integration.

**Target features:**
- Pre-scan orchestrator (SEED-006) — Hybrid bash/Python layer offloading ~60% of mechanical scanning work
- Security reference sub-skills (SEED-007) — Executable language-specific vulnerability patterns  
- Adversarial pattern library (SEED-008) — Semgrep ruleset for threat detection
- Git forensics agent (SEED-009) — Supply chain attack analysis
- Scanner operational excellence (SEED-010) — CI integration, baselines, supply chain intelligence, quarantine workflows

**Key context:** v1.0 shipped with skill lifecycle tooling (build/audit/tune); v1.1 focuses on making scanners production-grade through deterministic infrastructure and formal operational patterns.

## Previous Milestone: v1.0 (Shipped 2026-04-16)

✅ **All v1.0 features shipped and validated (2026-04-16)**

The complete skill lifecycle is now available:

- ✅ Guided skill scaffolding via `/gsd-build-skill` (SEED-001) — Creates convention-compliant skills with interactive guidance
- ✅ Skill quality auditing via `/gsd-audit-skill` (SEED-003) — Comprehensive quality reports (structural, SMART, prompt, tool checks)
- ✅ Human-in-the-loop skill tuning via `/gsd-tune-skill` (SEED-002) — Symptom-driven improvement with audit backing and regression safety
- ✅ Shared SMART criteria rubric (`references/skill-smart-criteria.md`) — 5-dimension quality framework
- ✅ Convention validation test suite (`tests/skill-audit-conventions.test.cjs`) — Validates all skills pass structural checks
- ✅ Audit extensions (CI-ready flags, depth control, fix routing, JSON output) — Production-ready auditing
- ✅ Batch mode for tuner (`--batch`) — Multi-skill improvement at milestone scale
- ✅ Transcript extraction for tuner (`--transcript`) — Friction signals from real sessions improve diagnosis

**Metrics:**
- 5 phases, 13 plans, 33/33 requirements satisfied
- 52 integration tests created
- Shipped: 2026-04-16 (2-day sprint from 2026-04-15)
- Audit: Passed (all requirements verified, cross-phase integration verified, E2E workflows complete)

## Requirements

### Validated (v1.0 Shipped)

- ✓ Guided skill scaffolding via `/gsd-build-skill` (SEED-001)
- ✓ Skill quality auditing via `/gsd-audit-skill` (SEED-003)
- ✓ Human-in-the-loop skill tuning via `/gsd-tune-skill` (SEED-002)
- ✓ Shared SMART criteria rubric (`references/skill-smart-criteria.md`)
- ✓ Convention validation test suite (`tests/skill-audit-conventions.test.cjs`)

### Active (v1.1 Current)

- [ ] Pre-scan orchestrator (bash/Python hybrid) (SEED-006)
- [ ] Security reference sub-skills — executable patterns (SEED-007)
- [ ] Adversarial pattern library — threat detection semgrep rules (SEED-008)
- [ ] Git forensics agent — supply chain analysis (SEED-009)
- [ ] Scanner operational excellence — CI, baselines, quarantine, SBOM (SEED-010)

### Future (v1.2+)

- [ ] Autonomous skill tuning (SEED-004)
- [ ] Skill marketplace and registry
- [ ] Performance optimization for large scale operations

### Out of Scope (v1.1)

- Autonomous scanner improvement — focus on deterministic infrastructure first
- Supply chain intelligence beyond API integration — external dependency tracking in v1.2

## Context

- **Previous milestone (v1.0):** Built skill lifecycle tooling (build/audit/tune)
- **Current milestone (v1.1):** Security & threat scanning infrastructure
- **Scanner challenge:** Current scanners are agent-driven, expensive (high token usage), and incomplete (miss tool-specific coverage)
- **Solution:** Pre-scan orchestrator (SEED-006) + pattern libraries (SEED-007, SEED-008) + git forensics (SEED-009) + operational framework (SEED-010)
- **Dependency order:** SEED-006 (orchestrator) enables SEED-007/008/009 (patterns/forensics) → SEED-010 (operations) aggregates them

## Constraints

- **Determinism required:** Pre-scan output must be reproducible — no LLM variance in mechanical scans
- **Tool coverage:** Support major ecosystems (Node/npm, Python/pip, Go, Rust, etc.) and scan types (deps, secrets, SAST, IaC, binary)
- **Token efficiency:** Offload 60%+ of mechanical work from LLM to local tools before agent sees data
- **Backward compatibility:** Don't break existing `/gsd-security-audit` and `/gsd-threat-scan` — extend them with pre-scan layer
- **Operational readiness:** CI integration, baseline management, and quarantine workflows must be production-grade from day one

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pre-scan orchestrator as foundation | Solves token cost and coverage problems holistically before adding features | 🔨 Implementing in Phase 1 (SEED-006) |
| Semgrep + community rules over custom patterns | Leverage battle-tested, maintained ruleset rather than hand-crafted patterns | Planned in SEED-007, SEED-008 |
| Git forensics as first-class gate | Supply chain attacks require deep history analysis that surface-level git commands miss | Planned in SEED-009 |
| Operational model (CI, baselines, quarantine) | Make scanning safe for automated pipelines, not just manual audits | Planned in SEED-010 |

## What's Next

- **Phase 1 (SEED-006):** Pre-scan orchestrator — bash shim + Python orchestrator + tool registry
- **Phase 2 (SEED-007):** Security patterns — language-specific sub-skills with executable rules
- **Phase 3 (SEED-008):** Threat patterns — adversarial detection ruleset
- **Phase 4 (SEED-009):** Git forensics — supply chain analysis
- **Phase 5 (SEED-010):** Operational excellence — CI, baselines, intelligence, quarantine
