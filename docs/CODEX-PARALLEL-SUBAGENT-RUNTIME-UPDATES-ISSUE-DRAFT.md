# Feature Request Draft: Codex Parallel Subagent Runtime Updates

> Submitted as https://github.com/gsd-build/get-shit-done/issues/3475.
> Do not open a PR until the issue is labeled `approved-feature`.

## Pre-submission checklist

- [x] I have searched existing issues and discussions — this has not been proposed and declined before.
- [x] I have read CONTRIBUTING.md and understand that I must wait for `approved-feature` before writing any code.
- [x] I have read the existing GSD commands and workflows and confirmed this feature does not duplicate existing behavior.
- [x] This feature solves a problem for solo developers using AI coding tools, not a personal preference or workflow I happen to like.

## Feature name

Codex Parallel Subagent Runtime Updates

## Type of addition

Other: runtime workflow/adapter behavior for an existing runtime.

## The Solo Developer Problem

Several GSD workflows are designed around independent agent fan-out: codebase mapping, documentation updates, planning research, execution waves, review/fix loops, and autonomous-style orchestration. In Claude Code, those workflows can delegate independent work to subagents. In Codex, GSD often falls back to sequential inline work even when Codex exposes `spawn_agent` and `wait_agent`.

For a solo developer using Codex, this loses one of GSD's main workflow benefits: independent mapping, planning, review, and execution tasks take longer, consume more main-session context, and force the orchestrator to do work that could safely be delegated. It also creates inconsistent runtime behavior: the same GSD workflow is parallel in Claude Code but unnecessarily serial in Codex.

## What This Feature Adds

This feature updates GSD's Codex runtime guidance so existing parallel workflows can use Codex subagents when the user explicitly authorizes subagent use for the current invocation.

It adds behavior so that:

1. Codex adapter guidance maps GSD `Agent()` / `Task()` launch patterns to Codex `spawn_agent` / `wait_agent`.
2. Workflows with meaningful independent fan-out can ask the user whether to use parallel Codex subagents when no explicit `--parallel` or `--no-parallel` choice is present.
3. Explicit user language such as "use parallel subagents" or workflow flags such as `--parallel` count as authorization for that invocation.
4. `--no-parallel`, missing Codex subagent tools, or declined authorization force the existing sequential inline fallback.
5. Workflows avoid changing Codex worktree semantics; if isolation cannot be represented safely, existing fail-closed behavior remains intact.

Example behavior:

```text
/skill:gsd-map-codebase --parallel
```

When Codex `spawn_agent` and `wait_agent` are available, GSD may spawn independent mapper agents and collect their results. Without explicit authorization, GSD asks first or uses the sequential fallback.

## Full Scope Of Changes

Files or systems likely modified:

- Codex runtime adapter guidance generated during install.
- Workflow prose for existing parallel workflows where Codex currently degrades to sequential behavior.
- Command metadata for workflows that need explicit `--parallel` / `--no-parallel` user controls.
- Tests covering adapter text, workflow authorization gates, sequential fallback, and no accidental worktree semantics changes.
- Documentation describing how Codex users can authorize parallel subagents.
- Changeset fragment for the user-visible Codex runtime behavior.

Systems affected:

- Runtime adapter conversion.
- Existing parallel GSD workflows.
- Codex workflow authorization and fallback behavior.
- Runtime documentation.

## User Stories

1. As a solo developer using Codex, I want `/skill:gsd-map-codebase --parallel` to use independent mapper subagents so that codebase mapping finishes faster and preserves main-session context.
2. As a solo developer using Codex, I want GSD to ask before using parallel subagents when a workflow can safely fan out so that I stay in control of resource usage and parallel edits.
3. As a solo developer using Codex, I want `--no-parallel` and missing subagent tools to fall back sequentially so that GSD remains usable in constrained sessions.

## Acceptance Criteria

- [ ] Codex adapter guidance maps GSD `Agent()` / `Task()` launch patterns to `spawn_agent` / `wait_agent`.
- [ ] Parallel workflows may use Codex subagents only after explicit authorization from a flag, direct user wording, or an affirmative prompt response.
- [ ] `--no-parallel` forces sequential inline behavior for affected workflows.
- [ ] Missing `spawn_agent` / `wait_agent` tools force sequential inline behavior rather than failing.
- [ ] Existing Codex worktree fail-closed behavior remains unchanged.
- [ ] Tests cover the Codex adapter mapping.
- [ ] Tests cover at least one command/workflow that accepts `--parallel` / `--no-parallel`.
- [ ] Tests cover at least one workflow prompt path where Codex asks before spawning subagents.
- [ ] Existing non-Codex runtime behavior remains unchanged.

## Which Area Does This Primarily Affect?

Multiple areas: runtime integration and existing parallel workflow behavior.

## Applicable Runtimes

- [x] Codex

## Breaking Changes Assessment

None expected.

This should be additive and backward compatible:

- Existing Codex sessions without subagent tools continue to use sequential fallback.
- Existing users can force sequential behavior with `--no-parallel` where supported.
- Existing worktree isolation safety behavior remains unchanged.
- Non-Codex runtimes keep their current behavior.

## Maintenance Burden

- No new dependencies.
- The behavior should live mostly in central Codex adapter guidance plus the small number of workflows that already model parallel fan-out.
- Future workflow changes that add parallel fan-out should follow the same authorization/fallback pattern.
- Tests must guard against accidentally using Codex subagents without explicit user authorization.
- Tests must guard against accidentally weakening existing Codex worktree safety boundaries.

## Alternatives Considered

1. Keep Codex workflows sequential.
   Rejected because Codex already has subagent tools, and sequential fallback wastes time and main-session context for naturally independent GSD work.

2. Always use Codex subagents automatically when available.
   Rejected because Codex requires explicit user authorization for subagent spawning, and users should control when parallel work is launched.

3. Add an entirely separate Codex-specific workflow set.
   Rejected because it would duplicate existing workflow logic and drift from the canonical GSD workflows. Adapter guidance and small workflow gates are lower maintenance.

4. Change Codex worktree semantics as part of this feature.
   Rejected because worktree isolation is a separate safety problem. This feature should preserve the existing fail-closed behavior for unsupported isolation.

## Prior Art And References

- #791: Codex request-user-input and multi-agent support.
- #3360 / #3365: Codex execute-phase subagent worktree safety boundary.

This proposal does not add Codex subagent infrastructure. It updates GSD's workflow and adapter guidance so existing Codex subagent capability can be used by GSD's parallel workflows with explicit user authorization.

## Additional Context

The intended runtime contract is:

- If the user explicitly authorizes parallel subagents and Codex subagent tools are available, use `spawn_agent` / `wait_agent` for independent work.
- If authorization is absent, ask before spawning or use the sequential fallback.
- If the user declines, passes `--no-parallel`, or tools are unavailable, stay sequential.
- Do not weaken existing safety boundaries around worktree isolation.
