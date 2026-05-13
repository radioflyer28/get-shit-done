# Phase 3: Auditor Extensions - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend `/gsd-audit-skill` with four operational flags: `--structural-only`, `--depth`,
`--fix`, and `--json`. No new check types are added — these flags control how existing
checks run and how output is consumed.

**Deliverables:**
- Extended `commands/gsd/audit-skill.md` — new flags in frontmatter + argument docs
- Extended `get-shit-done/workflows/audit-skill.md` — flag routing and output branching
- Extended `agents/gsd-skill-auditor.md` — depth parameter awareness (`audit_context.depth`)
- JSON output contract (stdout, pipe-friendly)

**Out of scope (v2 / later phases):**
- Multi-skill batch auditing (`--all` or glob patterns)
- Persistent audit history / trend tracking
- Any new check dimensions or scoring changes

</domain>

<decisions>
## Implementation Decisions

### --structural-only and --depth flags

- **D-01:** `--structural-only` runs only the deterministic structural integrity checks
  (Phase 2 check type 1: frontmatter fields, `<objective>` tags, `<execution_context>`
  path resolution, step uniqueness, `Task()` agent resolution, `<required_reading>` paths,
  path conventions). SMART scoring, prompt quality evaluation, and tool usage audit are
  skipped entirely. Exit code is nonzero if any structural check fails — CI-suitable.

- **D-02:** `--depth <quick|standard|deep>` controls audit depth:
  - `quick` — deterministic structural checks only (same behavior as `--structural-only`)
  - `standard` — full current audit (all 4 check types, current thresholds from D-03 in
    02-CONTEXT.md)
  - `deep` — full audit with expanded evidence collection and stricter warning surfacing
    (exact deep-mode behavior is agent's discretion; intent: surface more borderline issues
    and provide richer evidence citations)

- **D-03:** `--structural-only` and `--depth quick` are semantically equivalent.
  Implement `--structural-only` as a shorthand alias for `--depth quick`. No behavioral
  difference — same check set, same exit code semantics.

### --fix routing

- **D-04:** When `--fix` is passed, the auditor runs a full audit first (same as default
  or `--depth standard`), writes `SKILL-AUDIT.md` to disk, then routes findings to
  `/gsd-tune-skill` by passing the report path.

- **D-05:** If Phase 5 tuner (`/gsd-tune-skill`) is not installed when `--fix` is passed:
  print a soft warning and still complete the audit, writing SKILL-AUDIT.md as normal.
  Suggested warning text: `Note: /gsd-tune-skill not found — audit complete, but --fix
  routing is unavailable. Install Phase 5 or run /gsd-tune-skill manually with this report.`

- **D-06:** Route **all findings** from the remediation table to the tuner (no priority
  filtering). The tuner is responsible for triaging what to act on.

### --json output

- **D-07:** `--json` outputs JSON to **stdout only**. No separate `.json` file is written.
  SKILL-AUDIT.md is still written to disk as normal (the two outputs are independent).
  Stdout-only makes the flag pipe-friendly for CI and scripting consumers.

- **D-08:** JSON payload shape — flat findings list:
  ```json
  {
    "schema_version": "1.0",
    "skill": "<skill-name>",
    "verdict": "PASS | PASS WITH WARNINGS | FAIL",
    "score": <float>,
    "findings": [
      {
        "area": "<check-type: structural | smart | prompt | tool>",
        "id": "<e.g. S-01, SMART-02>",
        "priority": "<CRITICAL | HIGH | MEDIUM | LOW>",
        "issue": "<description>",
        "fix": "<suggested fix>"
      }
    ]
  }
  ```

- **D-09:** Include `schema_version: "1.0"` at the top level. This field is mandatory so
  downstream consumers can guard against breaking schema changes.

### Flag combinations

- **D-10:** `--json` can be combined with any depth flag (e.g., `--depth quick --json`
  produces a machine-readable structural-only result — useful for CI parsing). The
  findings array will contain only structural findings in that case.

- **D-11:** `--fix` combined with `--depth` uses whatever depth was requested for the
  audit pass, then routes all findings to the tuner (not just structural ones if
  `--depth quick`).

### Agent's Discretion
- Exact deep-mode expansion strategy (e.g., lower warning thresholds, more evidence
  sentences, additional heuristics) — the agent implements what makes `deep` meaningfully
  stricter than `standard`
- Whether flag conflicts (e.g., `--structural-only --fix`) should warn or silently resolve
  to a sensible default
- Internal mechanism for passing SKILL-AUDIT.md path to the tuner (env var, arg, or temp
  file reference)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 deliverables (direct inputs — extend, do not replace)
- `commands/gsd/audit-skill.md` — command file to extend with new flag definitions
- `get-shit-done/workflows/audit-skill.md` — workflow to extend with flag routing logic
- `agents/gsd-skill-auditor.md` — agent to extend with `audit_context.depth` awareness

### Phase 2 context (locked decisions to carry forward)
- `.planning/phases/02-skill-auditor-core/02-CONTEXT.md` — D-03 verdict thresholds,
  D-04 SKILL-AUDIT.md report format (remediation table structure), D-01 audit file scope,
  D-02 single-agent model

### Requirements
- `.planning/REQUIREMENTS.md` — AUDIT-07 (structural-only), AUDIT-08 (depth flag),
  AUDIT-09 (--fix), AUDIT-10 (--json)

### Phase 1 reference (structural check definitions)
- `get-shit-done/references/skill-smart-criteria.md` — SMART rubric (used in standard/deep
  modes; skipped in quick mode)
- `tests/skill-audit-conventions.test.cjs` — what CI already checks (structural checks in
  the auditor must complement, not duplicate these)

### Future phase reference (for --fix routing)
- Phase 5 tuner will be at `commands/gsd/tune-skill.md` — `--fix` routes to
  `/gsd-tune-skill`. Planner must not hard-code a path assumption; existence check at
  runtime is the contract.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `commands/gsd/audit-skill.md` — existing command with `--output <path>` flag pattern;
  new flags follow same frontmatter `allowed-tools:` pattern (not `tools:`)
- `get-shit-done/workflows/audit-skill.md` — existing flag routing logic (--output) is
  the pattern to extend for --structural-only, --depth, --fix, --json
- `agents/gsd-skill-auditor.md` — existing agent accepts `audit_context` object from
  workflow; depth parameter should be added to this context object

### Established Patterns
- Flag routing in GSD workflows: flags are parsed from `$ARGUMENTS`, then passed as
  structured context to agents (see audit-skill.md workflow)
- Platform path: `~/.copilot/` (not `~/.claude/`), `allowed-tools:` for command/skill
  files, `tools:` for agent files (Phase 1 convention)
- Stdout output: GSD tools use stdout for machine-readable output; files for human-readable
  reports

### Integration Points
- The `--fix` flag creates a dependency on Phase 5 (`/gsd-tune-skill`). The workflow must
  check for tuner existence at runtime before attempting to route.
- The `--json` stdout path must not interfere with the normal SKILL-AUDIT.md write path —
  both should be able to run in the same invocation.

</code_context>

<specifics>
## Specific Ideas

- `--structural-only` as an alias for `--depth quick` keeps the CLI surface intuitive:
  users who just want CI integration use `--structural-only`; users who want depth control
  use `--depth`. Both paths converge to the same execution.
- The soft warning for missing tuner should still print to stderr (not stdout) so it
  doesn't corrupt piped `--json` output when both flags are used together.
- `schema_version` field is in the top-level JSON object, not nested — makes it easy for
  consumers to check before parsing the rest.

</specifics>

<deferred>
## Deferred Ideas

- **Multi-skill batch auditing** (was AUDIT-08 `--all`) — deferred to v2 as ECO-04.
  Run `/gsd-audit-skill` across all installed skills with a single invocation. Belongs in
  its own phase once single-skill depth semantics are stable.
- **Persistent audit history / trend tracking** — surfaced during discussion as a natural
  extension of `--json` output. Not v1 scope.
- **Configurable `--fix` priority threshold** (e.g., `--fix --min-priority=P2`) — suggested
  during discussion. Deferred; all-findings routing is simpler and covers the tuner's needs.

</deferred>
