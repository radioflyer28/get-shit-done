---
id: SEED-005
status: dormant
planted: 2026-04-14
planted_during: pre-project (no milestone yet)
trigger_when: when scanner output quality is solid and the focus shifts to operationalizing scanning — CI integration, tracking scan state, supply chain intelligence, or formalized quarantine workflows
scope: Large
---

# SEED-005: Scanner Operational Excellence — CI, Baseline, Supply Chain Intel, Quarantine

## Why This Matters

The current scanners (`gsd-security-audit` and `gsd-threat-scan`) are invoked manually on demand.
This is fine for auditing unknown/untrusted code, but misses a huge ongoing value surface:
**continuous scanning as a development workflow gate.**

The stretch goals from the TODO (§5) represent the difference between "we have a scanner" and
"our scanner is operationally embedded in how we build software." Concretely:

- **CI on new dependencies:** Most supply chain attacks enter via `npm install` / `pip install`.
  A CI job that triggers threat scanning when `package.json`, `requirements.txt`, or lockfiles
  change catches this at the earliest possible moment — before code review, before merge.
- **Baseline mode:** Repeated scans on a known codebase produce the same findings over and over.
  A detect-secrets-style baseline file lets the scanner say "previously reviewed, still present,
  not escalated" — so re-scans focus analyst attention on *new* findings only.
- **Supply chain intelligence without installation:** Currently the scanner reads manifests but
  can't assess package reputation without running tools. Integrating OSV, deps.dev, and
  GitHub Advisory Database APIs (read-only, no package execution) provides reputation data
  before any install happens.
- **Formalized quarantine workflow:** The threat scanner has `quarantine: true/false` as a config
  flag but no defined protocol for what quarantine *means* — where files go, what format the
  report takes, how to release from quarantine. Formalizing this makes the scanner safe to use
  in automated pipelines where human review happens post-scan.
- **SBOM generation:** Knowing exactly what's in a codebase you're auditing is foundational to
  supply chain security. `syft`/`cyclonedx-cli` produce machine-readable SBOMs that can be
  diffed between scans to surface exactly what changed.

## When to Surface

**Trigger:** When scanner quality (SEED-001, SEED-002, SEED-003) is in place and the focus
shifts from "improve detection" to "embed scanning in the development workflow."

This seed should be presented during `/gsd-new-milestone` when the milestone scope matches:
- Milestone operationalizing security practices (DevSecOps, shift-left security)
- Milestone adding GitHub Actions or CI/CD integration to GSD workflows
- Milestone following completion of SEED-001 (pre-scan pipeline operational — now automate it)
- Milestone where "continuous security monitoring" is a stated goal
- Milestone adding supply chain security as a first-class concern

## Scope Estimate

**Large** — Multiple phases. Natural breakdown:

**Phase A: Baseline Mode (Medium, self-contained)**
- Baseline file format: JSON with finding fingerprints (file, line, rule, hash of surrounding context)
- `gsd-tools.cjs baseline create` — captures current scan state to `.security-baseline.json`
- `gsd-tools.cjs baseline diff` — compares current scan against baseline, shows only new findings
- Agent integration: if baseline exists, scan report marks each finding as `[NEW]` or `[KNOWN]`
- Threat scan variant: approved-as-suspicious findings get `[REVIEWED: suspicious but benign — REASON]` annotation

**Phase B: Supply Chain Intelligence API Integration (Medium)**
- Query OSV API (`https://api.osv.dev/v1/query`) for known vulnerabilities by package+version
- Query deps.dev API for package metadata: maintainer count, age, download velocity anomalies
- Query GitHub Advisory Database (via GraphQL, public, no auth required) for package advisories
- All read-only, no package installation
- Pre-scan orchestrator (SEED-001) gains a `supply_chain_intel` step that queries these APIs
  for all declared dependencies and returns reputation scores
- Agent uses scores to calibrate suspicion: newly-published package with high download spike → flag

**Phase C: CI/CD Integration — Dependency Change Trigger (Large)**
- GitHub Actions workflow: `.github/workflows/threat-scan-deps.yml`
  - Triggers on: PR changes to `package.json`, `package-lock.json`, `requirements.txt`,
    `Pipfile.lock`, `go.mod`, `Cargo.toml`, `Cargo.lock`, `Gemfile.lock`, `composer.lock`
  - Runs: SEED-001 pre-scan tools (deterministic, no agent cost) on changed dependencies only
  - Posts PR comment with findings summary
  - Agent-level analysis: triggered on `[CRITICAL]` findings only, or via manual PR comment trigger
- Design constraint: deterministic tools only in CI (no agent cost on every PR)
- Agent only engaged for: critical findings, manual trigger, or first-scan of a new dependency

**Phase D: SBOM + Quarantine Protocol Formalization (Medium)**
- SBOM generation: `syft . --output cyclonedx-json > .security/sbom.json` (via pre-scan)
  - Diff between scans: `gsd-tools.cjs sbom diff` surfaces exactly what changed
  - Attach SBOM to THREAT-SCAN.md / SECURITY-AUDIT.md output
- Quarantine protocol formalization:
  - `quarantine/` directory structure: `quarantine/TIMESTAMP-SCAN-ID/` with `README.md`, `files/` (copies), `FINDINGS.md`
  - `quarantine/README.md` template: what triggered quarantine, sha256 hashes, review status, release criteria
  - Release workflow: human reviews quarantine dir, runs `gsd-tools.cjs quarantine release SCAN-ID --reason "..."`
  - Quarantine entries feed into baseline (released-as-benign items don't re-trigger)

## Breadcrumbs

Related code and decisions found in the current codebase:

- `agents/gsd-threat-scanner.md` — `quarantine: true/false` config flag; `<config>` block parse step — current quarantine support is flag-only, no protocol
- `agents/gsd-security-scanner.md` — same pre-scan integration point for supply chain intel
- `get-shit-done/workflows/threat-scan.md` — workflow that would gain baseline diff step + SBOM generation
- `get-shit-done/workflows/security-audit.md` — same
- `get-shit-done/bin/lib/security.cjs` — existing security utilities; `gsd-tools.cjs` baseline/sbom/quarantine subcommands would live here
- `get-shit-done/SECURITY-SCANNER-TODO.md` — §5 (Stretch Goals): CI integration, Baseline Mode, SBOM Generation, License Compliance, Container Scanning, Runtime Analysis — full list of what this seed covers
- `.planning/seeds/SEED-001-security-prescan-orchestrator.md` — the pipeline that CI would run; Phase C depends on SEED-001 being complete

## Notes

Priority order from the TODO (§ Priority Order):
1. Pre-scan script (SEED-001) — prerequisite for most of this
2-4. Core scanning quality (SEED-002, SEED-003)
5. This seed (operational excellence) — comes after quality is solid

Phase A (Baseline) can be implemented independently of SEED-001 — it's a pure output-processing
feature. Phase B (Supply Chain Intel) also has minimal SEED-001 dependency.
Phase C (CI) is the highest-value but requires SEED-001 as the CI runtime.

Container scanning (`trivy image`) noted as future work — requires a built image, which breaks
the static-analysis constraint during threat scanning of untrusted code. Keep scoped to
security-audit (trusted code you're building) not threat-scan (untrusted code you're auditing).
