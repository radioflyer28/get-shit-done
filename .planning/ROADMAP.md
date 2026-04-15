# Roadmap: GSD Skill Lifecycle Tooling v1.0

## Overview

This milestone adds skill lifecycle tooling to GSD — create, audit, and tune skills through guided workflows and specialist agents. The three skills (`/gsd-build-skill`, `/gsd-audit-skill`, `/gsd-tune-skill`) share a common infrastructure of SMART criteria and structural conventions, with the auditor serving as the evaluation backbone that both the scaffolder and tuner depend on. The result: every GSD skill meets a consistent, verifiable quality bar.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Shared Infrastructure** - SMART rubric, convention tests, and authoring guide consumed by all three skills (completed 2026-04-15)
- [ ] **Phase 2: Skill Auditor Core** - Single-skill audit with structural, SMART, prompt quality, and tool usage checks
- [ ] **Phase 3: Auditor Extensions** - Operational flags for CI, batch mode, fix routing, and JSON output
- [ ] **Phase 4: Skill Scaffolder** - Guided skill creation with convention-compliant file generation
- [ ] **Phase 5: Skill Tuner** - Symptom-driven, human-in-the-loop skill improvement via audit-backed diagnosis

## Phase Details

### Phase 1: Shared Infrastructure
**Goal**: Codify the shared evaluation criteria, structural conventions, and authoring guide that all three lifecycle skills depend on
**Depends on**: Nothing (first phase)
**Seeds**: None (shared infrastructure)
**Requirements**: INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. `references/skill-smart-criteria.md` exists with all 5 SMART dimensions, sub-criteria, 1-5 scoring scale, and good/bad examples per dimension
  2. `tests/skill-audit-conventions.test.cjs` runs via vitest and validates structural conventions (frontmatter, paths, wiring) across all installed skills
  3. All existing 50+ skills pass the convention test suite (or known failures are explicitly documented with rationale)
  4. `references/skill-authoring.md` documents file structure, naming conventions, platform compatibility matrix, and common anti-patterns
**Plans**: 3 plans
- [x] 01-01-PLAN.md — Create skill-smart-criteria.md (SMART rubric, 5 dimensions, 1-5 scoring)
- [x] 01-02-PLAN.md — Create skill-audit-conventions.test.cjs (structural convention checks)
- [x] 01-03-PLAN.md — Create skill-authoring.md (authoring reference guide)

### Phase 2: Skill Auditor Core
**Goal**: Users can audit any single skill and receive a comprehensive quality report covering structure, SMART compliance, prompt quality, and tool usage
**Depends on**: Phase 1
**Seeds**: SEED-003
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05, AUDIT-06
**Success Criteria** (what must be TRUE):
  1. User can run `/gsd-audit-skill <name>` and have all related files (command, workflow, agent, references) automatically resolved
  2. Deterministic structural integrity checks validate frontmatter fields, `<objective>` tags, `<execution_context>` path resolution, step uniqueness, `Task()` agent resolution, `<required_reading>` paths, and path conventions
  3. SMART compliance scoring rates each of the 5 dimensions 1-5 with evidence citations from the skill files
  4. Prompt quality evaluation identifies issues in clarity, context sufficiency, guardrails, output format, error handling, and GSD anti-patterns
  5. GSD tool usage audit verifies `Task()` patterns, `AskUserQuestion` gates, `Bash()` safety, file operations, state management, and hook integration
  6. `SKILL-AUDIT.md` report is generated with verdict (PASS / PASS WITH WARNINGS / FAIL), structural table, SMART scorecard, prompt findings, tool findings, and remediation guidance
**Plans**: TBD

### Phase 3: Auditor Extensions
**Goal**: The auditor supports operational flags for CI integration, batch processing, fix routing, and programmatic output
**Depends on**: Phase 2
**Seeds**: SEED-003 (completion)
**Requirements**: AUDIT-07, AUDIT-08, AUDIT-09, AUDIT-10
**Success Criteria** (what must be TRUE):
  1. `--structural-only` flag runs only deterministic checks without LLM-dependent scoring, suitable for CI pipelines
  2. `--all` flag audits every installed skill in batch mode and produces an aggregate summary
  3. `--fix` flag routes audit findings to `/gsd-tune-skill` for remediation (requires Phase 5; graceful error if tuner not available)
  4. `--json` flag outputs structured JSON with all findings for programmatic consumption by other tools
**Plans**: TBD

### Phase 4: Skill Scaffolder
**Goal**: Users can create new skills through a guided workflow that produces structurally correct, convention-compliant file scaffolds
**Depends on**: Phase 1, Phase 2
**Seeds**: SEED-001
**Requirements**: SCAFFOLD-01, SCAFFOLD-02, SCAFFOLD-03, SCAFFOLD-04, SCAFFOLD-05, SCAFFOLD-06, SCAFFOLD-07, SCAFFOLD-08
**Success Criteria** (what must be TRUE):
  1. User can run `/gsd-build-skill` and interactively provide skill name, one-sentence description, and type classification (orchestrator / standalone / hybrid / informational)
  2. Existing reusable agents are identified and surfaced to the user before new agent creation is offered
  3. Tool permissions in the generated scaffold are validated against the platform compatibility matrix from `skill-authoring.md`
  4. Correct file scaffold is generated: `commands/gsd/{name}.md`, `get-shit-done/workflows/{name}.md`, and optionally `agents/gsd-{name}.md` and `get-shit-done/references/{name}*.md`
  5. Generated files pass the auditor's structural integrity checks (via `/gsd-audit-skill` or inline fallback if auditor unavailable)
  6. New agent registration prompts appear when agents need adding to `agent-contracts.md` or model profiles
  7. Stub templates include SMART-compliant step patterns with `TODO:` markers for user completion
  8. `node bin/install.js --dry-run` confirms newly scaffolded files are recognized by the install system
**Plans**: TBD

### Phase 5: Skill Tuner
**Goal**: Users can improve existing skills through a symptom-driven, human-in-the-loop workflow that produces targeted, non-regressive fixes backed by audit diagnosis
**Depends on**: Phase 2, Phase 3
**Seeds**: SEED-002
**Requirements**: TUNE-01, TUNE-02, TUNE-03, TUNE-04, TUNE-05, TUNE-06, TUNE-07, TUNE-08, TUNE-09, TUNE-10
**Success Criteria** (what must be TRUE):
  1. User can run `/gsd-tune-skill <name>` and interactively describe the symptom (what happened vs. what should have happened)
  2. Diagnosis is delegated to `/gsd-audit-skill` — the tuner works from `SKILL-AUDIT.md` findings, not raw skill files
  3. When a symptom is provided, audit findings are prioritized by relevance to the reported symptom
  4. `--transcript <path>` flag extracts friction signals from a session transcript and cross-references them against audit findings
  5. `gsd-skill-tuner` agent proposes minimal, targeted unified diffs with rationale linking each change to specific audit findings
  6. Human review gate presents Approve / Reject / Refine options with up to 3 refinement iterations before requiring explicit override
  7. Approved edits are committed atomically with message format `fix(skill): tune {skill-name} — {symptom summary}`
  8. Post-fix audit re-runs `/gsd-audit-skill --structural-only` to verify no structural regressions were introduced
  9. `--dry-run` flag shows proposed diffs without applying any changes
  10. `--batch` flag processes multiple issues from a file for milestone-scale quality improvement
**Plans**: TBD

## Milestone Success Criteria

v1.0 is complete when:

1. **Shared foundation is solid**: SMART rubric and authoring guide are published references; convention tests pass for all installed skills
2. **Any skill can be audited**: `/gsd-audit-skill` produces a comprehensive, actionable report for any named skill with verdict and remediation guidance
3. **New skills start correct**: `/gsd-build-skill` generates convention-compliant scaffolds that pass structural checks out of the box
4. **Existing skills can be improved**: `/gsd-tune-skill` takes a symptom, diagnoses via auditor, proposes targeted fixes, and commits only after human approval with no regressions
5. **Lifecycle is connected**: Scaffolder validates via auditor, tuner diagnoses via auditor, `--fix` routes from auditor to tuner — the tools compose

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Shared Infrastructure | 3/3 | Complete   | 2026-04-15 |
| 2. Skill Auditor Core | 0/2 | Planned    |  |
| 3. Auditor Extensions | 0/? | Not started | - |
| 4. Skill Scaffolder | 0/? | Not started | - |
| 5. Skill Tuner | 0/? | Not started | - |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
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
| SCAFFOLD-01 | Phase 4 | Pending |
| SCAFFOLD-02 | Phase 4 | Pending |
| SCAFFOLD-03 | Phase 4 | Pending |
| SCAFFOLD-04 | Phase 4 | Pending |
| SCAFFOLD-05 | Phase 4 | Pending |
| SCAFFOLD-06 | Phase 4 | Pending |
| SCAFFOLD-07 | Phase 4 | Pending |
| SCAFFOLD-08 | Phase 4 | Pending |
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

**Coverage:** 31/31 v1 requirements mapped ✓

---
*Roadmap created: 2025-04-15*
*Last updated: 2025-04-15*
