# GSD Milestones

## v1.1 — Security & Threat Scanner Tooling

**Status:** ✅ Shipped 2026-04-16  
**Phases:** 6–10  
**Plans:** 8  
**Requirements:** 22/22 satisfied  
**Tests added:** ~237

### Delivered

Operationalized code security and threat scanning through deterministic infrastructure, replacing token-expensive LLM scanning with a hybrid pre-scan architecture.

1. **Pre-scan orchestrator** — Bash/Python hybrid offloads ~60% of mechanical scanning; 19-tool registry; `PRE-SCAN-RESULTS.json` schema
2. **7 language pattern files** — OWASP Top 10 patterns with executable semgrep/grep rules for Python, JS/TS, Go, Rust, Java, C/C++, PHP
3. **Adversarial pattern library** — 25 semgrep rules across 6 malicious code categories (backdoor, exfil, supply_chain, logic_bomb, obfuscation, osint)
4. **Git forensics engine** — Supply chain attack detection via commit history, binary blobs, reflog analysis, author anomalies
5. **Operational stack** — CI mode, baseline management, supply chain intelligence (OSV/deps.dev/GitHub Advisory), SBOM generation, quarantine protocol

### Git Range

`7174460` (start v1.1) → `8b4dc2c` (final test fixes)

---

## v1.0 — Skill Lifecycle Tooling

**Status:** ✅ Shipped 2026-04-16  
**Phases:** 1–5  
**Plans:** 13  
**Requirements:** 33/33 satisfied  
**Tests added:** 52

### Delivered

Complete skill lifecycle: scaffolding, auditing, tuning.

1. Guided skill scaffolding via `/gsd-build-skill` (SEED-001)
2. Skill quality auditing via `/gsd-audit-skill` (SEED-003)
3. Human-in-the-loop skill tuning via `/gsd-tune-skill` (SEED-002)
4. Shared SMART criteria rubric (`references/skill-smart-criteria.md`)
5. Convention validation test suite + CI-ready audit extensions
