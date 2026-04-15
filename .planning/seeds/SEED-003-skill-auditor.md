---
id: SEED-003
status: activated
planted: 2026-04-15
activated_during: v1.0
trigger_when: when skill quality assurance becomes important — after the skill library is established, or when SEED-001 (build-skill) lands and new skills need quality gates before integration
scope: Medium
---

# SEED-003: `/gsd-audit-skill` — Skill Quality Auditor and SMART Compliance Checker

## Why This Matters

GSD skills are the "programs" that agents execute. A poorly structured skill — vague
instructions, wrong tool permissions, missing integration points, unbounded scope — produces
unreliable agent behavior that's hard to diagnose. Currently there's no way to systematically
evaluate whether a skill meets GSD's quality bar before it's used in anger.

The skill auditor fills the gap between *building* a skill (SEED-001) and *tuning* a skill
(SEED-002/004). It answers: **"Is this skill ready for production use?"** — checking both
structural correctness (is it wired up right?) and instruction quality (will an agent
produce good results following these prompts?).

The auditor enforces SMART principles across all skill artifacts:
- **Specific:** Each workflow step has a clear, unambiguous instruction — not "analyze the code"
  but "read files matching `src/**/*.ts`, extract exported function signatures, classify by
  complexity"
- **Measurable:** Steps define observable completion criteria — not "ensure quality" but
  "produce REVIEW.md with ≥1 finding per scanned file or explicit 'no issues found' entry"
- **Achievable:** Tool permissions match what the workflow actually needs; no steps require
  capabilities the agent doesn't have (e.g., web search without the tool, file writes with
  read-only tools)
- **Relevant:** Every step contributes to the skill's stated objective; no orphan steps,
  no steps that duplicate work already done by a prior step or spawned sub-agent
- **Time-bound:** Long-running steps have depth gates or file-count thresholds; unbounded
  loops have explicit iteration caps; the workflow has a clear terminal state

Together, `/gsd-build-skill` (SEED-001) scaffolds skills that start right, `/gsd-audit-skill`
(this seed) validates they stay right, and `/gsd-tune-skill` (SEED-002) fixes what the auditor
flags. The three form a complete skill lifecycle: **create → audit → tune**.

## When to Surface

**Trigger:** When skill quality assurance becomes a priority — either because the skill library
has grown large enough that consistency matters, or because SEED-001 lands and generated skills
need a quality gate before they're trusted.

This seed should be presented during `/gsd-new-milestone` when the milestone scope matches:
- Milestone focused on skill quality, reliability, or standardization
- Milestone following completion of SEED-001 (skills are being created — now audit them)
- Milestone enabling community/external skill contributions (need quality gates for untrusted skills)
- Milestone where agent instruction quality or prompt engineering is a stated concern
- Milestone adding a skill registry, marketplace, or sharing mechanism

## Scope Estimate

**Medium** — One focused phase. Includes:

**Core workflow: `get-shit-done/workflows/audit-skill.md`**

Step flow:

1. **Skill selection** — which skill to audit? Accept name via `$ARGUMENTS` or list available
   skills for selection. Resolve the full file set: `commands/gsd/{name}.md` (command def),
   `get-shit-done/workflows/{name}.md` (workflow), `agents/gsd-{name}.md` (agent, if any),
   `get-shit-done/references/{name}*.md` (references, if any)

2. **Structural integrity audit** — deterministic checks (can be partially automated):
   - **Command file checks:**
     - Frontmatter: `name`, `description`, `argument-hint`, `allowed-tools` all present
     - `<objective>` tag present with non-empty content
     - `<execution_context>` tag points to a workflow file that exists
     - `<process>` tag references the same workflow as `<execution_context>`
   - **Workflow file checks:**
     - File exists at the path referenced by the command
     - All `<step>` blocks have unique names
     - All `Task()` spawns reference agents that exist in `agents/`
     - All `<required_reading>` paths resolve to real files
     - `text_mode` handling present if the skill runs on non-Claude runtimes
     - No hardcoded `~/.claude/` paths (should use runtime-appropriate path)
   - **Agent file checks (if skill has a dedicated agent):**
     - Frontmatter includes `tools:` with permissions matching what the workflow needs
     - Anti-heredoc instruction present if agent has write permissions
     - Agent is registered in `agent-contracts.md` if applicable
   - **Installation checks:**
     - `bin/install.js` would pick up the new files (simulate `--dry-run`)
     - No filename collisions with existing commands
     - No orphaned files (workflow exists but no command points to it, or vice versa)

3. **SMART compliance audit** — agent-evaluated quality checks:
   - **Specific:** For each workflow step, evaluate:
     - Does the instruction tell the agent *what* to do, *where* to look, and *what to produce*?
     - Are file patterns, output formats, and decision criteria explicit?
     - Flag: vague verbs without concrete actions ("analyze", "ensure", "handle appropriately")
   - **Measurable:** For each workflow step, evaluate:
     - Is there an observable output (file created, section written, decision recorded)?
     - Can a verifier determine whether this step succeeded without re-running it?
     - Flag: steps with no visible artifact or completion signal
   - **Achievable:** Cross-reference workflow steps against tool permissions:
     - Does any step require a tool not in `allowed-tools`?
     - Does any step assume capabilities beyond the agent's reach (e.g., running a server,
       accessing external APIs without web tools, writing files with read-only permissions)?
     - Does any step assume context that isn't provided by prior steps or `<required_reading>`?
     - Flag: impossible steps, context gaps, permission mismatches
   - **Relevant:** Evaluate workflow coherence:
     - Does every step contribute to the `<objective>`?
     - Are there duplicate efforts (step does work a spawned sub-agent also does)?
     - Are there orphan steps (not referenced by any other step, not a terminal step)?
     - Does the skill's scope match its description? (e.g., description says "quick check"
       but workflow has 15 steps with deep analysis)
     - Flag: scope creep, redundancy, objective drift
   - **Time-bound:** Evaluate execution bounds:
     - Do file-processing steps have scope limits (max files, glob patterns, depth gates)?
     - Do loops/iterations have explicit caps?
     - Is there a clear terminal state (the workflow ends, not just trails off)?
     - Are depth modes (`--depth=quick|standard|deep`) present for variable-scope work?
     - Flag: unbounded loops, missing iteration caps, no terminal state

4. **Prompt quality evaluation** — evaluate the quality of instructions the agent receives:
   - **Clarity:** Are instructions written in imperative, unambiguous language?
   - **Context sufficiency:** Does the agent receive enough context to make good decisions,
     or does it need to guess? (Missing context → hallucination risk)
   - **Guardrails:** Are there explicit "do NOT" constraints for common failure modes?
   - **Output format:** Is the expected output format specified (markdown structure, JSON
     schema, file naming convention)?
   - **Error handling:** What happens when a step fails or produces no results? Is there
     a fallback, or does the workflow silently proceed with bad state?
   - **Anti-patterns:** Check for known GSD prompt anti-patterns:
     - Heredoc usage in file-writing instructions
     - `Bash(cat << 'EOF')` patterns
     - Overly long steps that should be decomposed
     - Steps that mix decision-making with execution (should be separate)

5. **GSD tool usage audit** — verify correct use of GSD-specific tools and conventions:
   - `Task()` spawn patterns: correct agent name, appropriate context passed, return value used
   - `AskUserQuestion` usage: present at appropriate gates (not skipped for convenience)
   - `Bash()` commands: no destructive operations without confirmation, no `--no-verify` flags
   - File operations: atomic writes where required, correct path construction
   - State management: `gsd-tools.cjs` calls use correct subcommands and arguments
   - Hook integration: workflow emits appropriate hooks (`gsd-phase-boundary`, etc.) if applicable

6. **Report generation** — produce `SKILL-AUDIT.md`:
   - **Verdict:** PASS / PASS WITH WARNINGS / FAIL
   - **Structural findings:** table of checks with ✅/❌/⚠️ status
   - **SMART scorecard:** S/M/A/R/T score per dimension (1-5 scale) with evidence
   - **Prompt quality findings:** classified by severity (blocking / warning / suggestion)
   - **Tool usage findings:** correct/incorrect/missing tool usage patterns
   - **Remediation guidance:** for each finding, specific fix instruction (not just "fix this")
   - **Comparison to exemplars:** how this skill compares to well-established skills
     (e.g., `code-review`, `plan-phase`, `execute-phase`)

**New agent: `gsd-skill-auditor`**
- Reads all skill files + GSD conventions reference + exemplar skills for comparison
- Performs SMART evaluation and prompt quality assessment
- Produces structured findings with severity classification
- Key constraint: the auditor evaluates but never modifies — it's a read-only analysis tool.
  Fixes go through `/gsd-tune-skill` (SEED-002) or manual editing.

**Flags:**
- `--fix` — after audit, automatically route FAIL/WARNING findings to `/gsd-tune-skill`
  (SEED-002) for remediation (requires SEED-002 to be implemented)
- `--all` — audit every installed skill (batch mode for milestone-scale quality sweeps)
- `--structural-only` — skip SMART/prompt evaluation, only run deterministic structural checks
  (fast, suitable for CI)
- `--json` — output findings as JSON for programmatic consumption (CI integration, metrics)
- `--compare <exemplar>` — explicitly set the exemplar skill to compare against

**New reference file: `references/skill-smart-criteria.md`**
- Canonical SMART rubric for GSD skills with examples of good/bad for each dimension
- Consumed by both `gsd-skill-auditor` (this seed) and `gsd-skill-scaffolder` (SEED-001)
  to ensure skills are SMART from creation through ongoing maintenance

**Test file: `tests/skill-audit-conventions.test.cjs`**
- Deterministic subset of the structural checks (step 2) that can run without an agent
- Validates all installed skills pass structural integrity checks
- Runs in CI — catches regressions when skills are modified

## Breadcrumbs

Related code and decisions found in the current codebase:

- `commands/gsd/*.md` — 75 existing command files; audit targets and exemplar sources
- `get-shit-done/workflows/*.md` — existing workflows; structural checks validate these
- `agents/*.md` — existing agents; agent file checks validate frontmatter and conventions
- `tests/agent-frontmatter.test.cjs` — existing frontmatter validation; pattern for structural
  checks (anti-heredoc, tools field, spawn consistency)
- `tests/agent-skills-awareness.test.cjs` — existing skills awareness checks; related validation
- `tests/anti-pattern-enforcement.test.cjs` — existing anti-pattern checks; prompt quality
  evaluation extends this concept to individual skills
- `tests/skill-manifest.test.cjs` — existing skill manifest test; structural overlap
- `bin/install.js` — installer; auditor verifies files would be correctly installed
- `get-shit-done/references/agent-contracts.md` — agent registration; auditor checks alignment
- `.planning/seeds/SEED-001-build-skill-scaffolder.md` — the creation counterpart; auditor
  validates what the scaffolder produces. Both consume `references/skill-smart-criteria.md`
- `.planning/seeds/SEED-002-tune-skill-human-loop.md` — the remediation counterpart; auditor
  findings feed into tune-skill as structured input via `--fix` flag
- `.planning/seeds/SEED-004-autoresearch-skill-loop.md` — autonomous loop; audit scores
  could serve as the "metric" the autoresearch loop optimizes against

## Notes

**Relationship to the skill lifecycle (SEED-001 → 003 → 002 → 004):**
- SEED-001 (`/gsd-build-skill`): **Create** — scaffold a new skill with correct structure
- SEED-003 (`/gsd-audit-skill`): **Audit** — validate the skill meets quality bar (this seed)
- SEED-002 (`/gsd-tune-skill`): **Tune** — fix specific issues found by audit or user reports
- SEED-004 (autoresearch loop): **Evolve** — autonomously improve skills based on usage signal

The auditor is the quality gate between creation and production use. A natural CI integration:
`/gsd-audit-skill --all --structural-only --json` runs on every PR that modifies skill files.

**The auditor is the shared evaluation backbone for the entire skill lifecycle:**
SEED-002 (tune-skill) and SEED-004 (autoresearch loop) both delegate diagnosis to this
auditor rather than implementing their own evaluation logic. This is a deliberate architectural
decision to prevent duplicate/conflicting quality criteria:
- **SEED-002** runs the auditor first, then its `gsd-skill-tuner` agent proposes fixes for
  the findings. The tuner is a *fixer*, not a *diagnoser*.
- **SEED-004** runs the auditor in `--json` mode, cross-references SMART scores against
  friction signals from session transcripts, and uses the correlation to generate high-
  confidence edit proposals. Post-edit, it re-runs the auditor to verify no SMART regression.
- **SEED-001** generates skills that aim for SMART compliance from the start.

All four seeds consume the same rubric (`references/skill-smart-criteria.md`). One source of
truth for "what does a good skill look like?" — not three parallel evaluation engines that
drift apart over time.

**Why read-only:** The auditor deliberately does not fix what it finds. Mixing diagnosis and
repair in a single tool creates incentive to auto-fix without understanding — exactly the
anti-pattern GSD avoids with its discuss→plan→execute separation. The auditor diagnoses;
the user (or `/gsd-tune-skill`) decides what to fix and how.

**Structural checks as a test suite:** The deterministic checks in step 2 can (and should)
also exist as `tests/skill-audit-conventions.test.cjs` — a CI-runnable test that catches
structural regressions without needing an agent. The agent-evaluated checks (steps 3-5) are
the value-add that justifies a dedicated `/gsd-audit-skill` command beyond what tests cover.

**Scope boundary — skills vs reference data:** The auditor evaluates *skills* (command +
workflow + agent bundles). Pattern files produced by SEED-007/SEED-008 (OWASP references,
adversarial rulesets) are reference data, not skills — they don't have command files,
workflows, or agent definitions. The auditor does not audit reference data. This distinction
prevents scope creep into linting arbitrary markdown files.
