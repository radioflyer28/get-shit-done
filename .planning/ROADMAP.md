# Roadmap: GSD Project

## Milestones

- ✅ **v1.0 Skill Lifecycle Tooling** — `/gsd-build-skill`, `/gsd-audit-skill`, `/gsd-tune-skill` (shipped 2026-04-16)  
  See [archived roadmap](milestones/v1.0-ROADMAP.md)

- � **v1.1 Security & Threat Scanner Tooling** — Pre-scan orchestrator, pattern libraries, git forensics, CI integration (current)
  - Phase 6: Pre-Scan Orchestrator (SEED-006)
  - Phase 7: Security Reference Sub-Skills (SEED-007)
  - Phase 8: Threat Adversarial Pattern Library (SEED-008)
  - Phase 9: Git Forensics Agent (SEED-009)
  - Phase 10: Scanner Operational Excellence (SEED-010)

- 📋 **v1.2** — Performance optimization, autonomous foundation research, marketplace groundwork (planned)

- 📋 **v2.0 Autonomous Skills & Ecosystem** — Autoresearch-driven skill improvement, marketplace integration (future)

## Current Focus

**v1.1 In Progress** — Security & threat scanner operationalization through deterministic infrastructure.

**Status:** Phase 6 complete (28/28 tests passing, all ORK requirements verified). Phase 7 planned (4 plans, all SEC requirements covered). Phase 7 execution ready.

## Phases in v1.1 (Planned)

| Phase | Title | Goal | Requirements | Status |
|-------|-------|------|--------------|--------|
| 6 | Pre-Scan Orchestrator | Hybrid bash/Python layer offloads mechanical scanning | ORK-01 to ORK-10 | ✅ Complete (2026-04-15) |
| 7 | Security Patterns | Language-specific executable vulnerability rules | SEC-01 to SEC-05 | 🔨 Planned (2026-04-17) |
| 8 | Threat Patterns | Adversarial/malicious code detection ruleset | THR-01 to THR-05 | Not started |
| 9 | Git Forensics | Supply chain attack analysis via commit history | FOR-01 to FOR-07 | Not started |
| 10 | Scanner Operations | CI integration, baselines, quarantine, SBOM | OPS-01 to OPS-08 | Not started |


## Phase 7: Security Patterns (Planned)

**Goal:** Implement language-specific executable vulnerability rules (SEC-01 to SEC-05).

**4 Plans Ready:**
- 07-01-PLAN.md — Injection attack patterns (SQL, command, template)
- 07-02-PLAN.md — Authentication/session vulnerability patterns
- 07-03-PLAN.md — Cryptographic weakness patterns
- 07-04-PLAN.md — Data exposure & storage patterns

**Status:** All plans complete. Execution ready.

## Quick Links

- **v1.1 Requirements:** [REQUIREMENTS.md](REQUIREMENTS.md)
- **v1.1 Project Context:** [PROJECT.md](PROJECT.md)
- **v1.1 State:** [STATE.md](STATE.md)
- **v1.0 Archive:** [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- **v1.0 Audit:** [v1.0-MILESTONE-AUDIT.md](v1.0-MILESTONE-AUDIT.md)

---

*Roadmap updated for v1.1 milestone start (2026-04-16)*
*Next Step: Execute Phase 7 via `/gsd-execute-phase 07` or continue planning Phase 8*




