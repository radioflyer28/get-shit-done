# Requirements: GSD Skill Lifecycle Tooling

**Defined:** 2025-04-15
**Core Value:** Every GSD skill meets a consistent quality bar — structurally correct, SMART-compliant, and improvable through a repeatable feedback loop.

## v1 Requirements

Requirements for milestone v1.0. Each maps to roadmap phases.

### Shared Infrastructure

- [ ] **INFRA-01**: `references/skill-smart-criteria.md` exists with SMART rubric (5 dimensions, sub-criteria, scoring 1-5, good/bad examples per dimension)
- [ ] **INFRA-02**: `tests/skill-audit-conventions.test.cjs` validates all installed skills pass deterministic structural checks (frontmatter, paths, wiring)
- [ ] **INFRA-03**: `references/skill-authoring.md` documents GSD skill file structure, conventions, platform compatibility matrix, and common anti-patterns

### Skill Scaffolding (`/gsd-build-skill` — SEED-001)

- [ ] **SCAFFOLD-01**: User can run `/gsd-build-skill` and interactively provide: skill name, one-sentence description, skill type (orchestrator / standalone / hybrid / informational)
- [ ] **SCAFFOLD-02**: Workflow identifies reusable existing agents and surfaces them before creating new ones
- [ ] **SCAFFOLD-03**: Tool permissions are validated against platform compatibility matrix
- [ ] **SCAFFOLD-04**: Correct file scaffold is generated: `commands/gsd/{name}.md`, `get-shit-done/workflows/{name}.md`, and optionally `agents/gsd-{name}.md`, `get-shit-done/references/{name}*.md`
- [ ] **SCAFFOLD-05**: Generated files pass SEED-003's structural integrity checks (or inline fallback if auditor not yet available)
- [ ] **SCAFFOLD-06**: Registration prompts appear when new agents need adding to `agent-contracts.md` or model profiles
- [ ] **SCAFFOLD-07**: Stub templates include SMART-compliant step patterns with `TODO:` markers
- [ ] **SCAFFOLD-08**: Install validation via `node bin/install.js --dry-run` confirms new files are picked up

### Skill Auditing (`/gsd-audit-skill` — SEED-003)

- [ ] **AUDIT-01**: User can run `/gsd-audit-skill <name>` to audit a single skill, resolving all related files (command, workflow, agent, references)
- [ ] **AUDIT-02**: Structural integrity checks run deterministically: frontmatter fields, `<objective>` tag, `<execution_context>` path resolution, step uniqueness, `Task()` agent resolution, `<required_reading>` path resolution, `text_mode` handling, path conventions
- [ ] **AUDIT-03**: SMART compliance audit scores each dimension 1-5 with evidence: Specific (concrete actions), Measurable (observable outputs), Achievable (tool permission alignment), Relevant (objective coherence), Time-bound (execution bounds)
- [ ] **AUDIT-04**: Prompt quality evaluation checks clarity, context sufficiency, guardrails, output format, error handling, and GSD anti-patterns (heredoc, overly long steps, mixed decision/execution)
- [ ] **AUDIT-05**: GSD tool usage audit verifies `Task()` patterns, `AskUserQuestion` gates, `Bash()` safety, file operations, state management, hook integration
- [ ] **AUDIT-06**: Report generated as `SKILL-AUDIT.md` with verdict (PASS/PASS WITH WARNINGS/FAIL), structural table, SMART scorecard, prompt findings, tool findings, remediation guidance
- [ ] **AUDIT-07**: `--structural-only` flag runs only deterministic checks (fast, CI-suitable)
- [ ] **AUDIT-08**: `--all` flag audits every installed skill in batch mode
- [ ] **AUDIT-09**: `--fix` flag routes findings to `/gsd-tune-skill` for remediation (requires SEED-002)
- [ ] **AUDIT-10**: `--json` flag outputs findings as structured JSON for programmatic consumption

### Skill Tuning (`/gsd-tune-skill` — SEED-002)

- [ ] **TUNE-01**: User can run `/gsd-tune-skill <name>` with a symptom description (what happened, what should have happened)
- [ ] **TUNE-02**: Diagnosis delegated to `/gsd-audit-skill` — tuner receives `SKILL-AUDIT.md` findings, not raw files
- [ ] **TUNE-03**: When symptom is provided, audit findings are prioritized by relevance to the reported symptom
- [ ] **TUNE-04**: `--transcript <path>` flag extracts friction signals from session transcript and cross-references against audit findings
- [ ] **TUNE-05**: `gsd-skill-tuner` agent proposes minimal, targeted unified diff with rationale linking to specific audit findings
- [ ] **TUNE-06**: Human review gate: Approve / Reject / Refine with up to 3 refinement iterations
- [ ] **TUNE-07**: Approved edits committed with message format: `fix(skill): tune {skill-name} — {symptom summary}`
- [ ] **TUNE-08**: Post-fix audit re-runs `/gsd-audit-skill --structural-only` to verify no regressions
- [ ] **TUNE-09**: `--dry-run` flag shows proposed diff without applying
- [ ] **TUNE-10**: `--batch` flag processes multiple issues from a file for milestone-scale quality sprints

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Autonomous Skill Tuning (SEED-004)

- **AUTO-01**: Autonomous skill improvement loop using Karpathy autoresearch pattern
- **AUTO-02**: Audit scores as optimization metric for autonomous tuning
- **AUTO-03**: Session transcript analysis for automatic friction detection

### Ecosystem

- **ECO-01**: Skill marketplace or registry for sharing skills
- **ECO-02**: `--full` flag for scaffolder to generate complete working skills (not just stubs)
- **ECO-03**: Skill versioning and changelog tracking

## Out of Scope

| Feature | Reason |
|---------|--------|
| Autonomous tuning (SEED-004) | Requires manual tuning proven first; Large scope |
| Skill marketplace / registry | No sharing mechanism needed in v1 |
| External contributor onboarding | Build-skill handles creation, not contributor docs |
| Scanner seeds (006-010) | Separate concern, separate milestone |
| Skill versioning | v1 focuses on quality, not change tracking |

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
*Last updated: 2025-04-15 after roadmap creation*