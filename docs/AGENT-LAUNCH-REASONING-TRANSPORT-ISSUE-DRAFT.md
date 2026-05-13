# Feature Request Draft: Agent-Launch Reasoning Transport

> Draft only. Do not submit until reviewed.

## Pre-submission checklist

- [x] I have searched existing issues and discussions — this has not been proposed and declined before.
- [x] I have read CONTRIBUTING.md and understand that I must wait for `approved-feature` before writing any code.
- [x] I have read the existing GSD commands and workflows and confirmed this feature does not duplicate existing behavior.
- [x] This feature solves a problem for solo developers using AI coding tools, not a personal preference or workflow I happen to like.

## Feature name

Agent-Launch Reasoning Transport

## Type of addition

Other: runtime/model transport behavior for existing agent launches.

## The Solo Developer Problem

GSD already has central model policy for choosing the right model tier for each agent and phase of work. Some runtimes also support launch-time reasoning effort, but GSD's agent-launch paths do not consistently transport the resolved effort alongside the resolved model when starting child agents.

For a solo developer, this means planning, execution, review, and verification agents can receive the intended model but not the intended reasoning level. The result is either underpowered high-stakes work, overpowered routine work, or inconsistent behavior between the central model policy and what launched agents actually use.

## What This Feature Adds

This feature makes launch-time reasoning effort a first-class transported value in GSD's existing model-resolution flow.

It adds behavior so that:

1. GSD resolves both `model` and `reasoning_effort` from the same central policy source.
2. Query surfaces that expose resolved model information also expose resolved `reasoning_effort` when one exists.
3. Runtime adapters that translate GSD agent-launch syntax pass `reasoning_effort` into child-agent launches only for runtimes that support it.
4. Runtimes that do not support launch-time reasoning effort continue to omit it.

This does not add a new command or a new model policy system. It closes the transport gap between existing model policy and existing agent-launch behavior.

Example resolved query output:

```json
{
  "model": "some-runtime-model-id",
  "profile": "balanced",
  "reasoning_effort": "medium"
}
```

Example adapter behavior:

```text
Agent(subagent_type="gsd-planner", model="{resolved_model}", reasoning_effort="{resolved_effort}", prompt="...")
```

If `reasoning_effort` is missing, empty, `"inherit"`, or unsupported by the runtime, the adapter omits it.

## Full Scope Of Changes

Files or systems likely modified:

- Model resolution query surfaces: expose resolved `reasoning_effort` alongside resolved `model`.
- Core model resolution helpers: preserve the existing allowlist and tier-merge behavior for effort resolution.
- Runtime adapter text/converters: document and apply the transport rule for agent/subagent launches.
- Workflow launch guidance: ensure workflows that launch agents request and transport both resolved model and effort through the central policy path.
- Tests: add coverage for query output, adapter behavior, allowlist gating, and profile/phase/dynamic-routing/per-agent precedence.
- Documentation: update model profile/runtime documentation to state that launch-time effort is centrally resolved and transported only when supported.
- Changeset: add an `Added` or `Changed` fragment for the user-visible behavior.

Systems affected:

- Model profile resolution.
- Phase-type model maps.
- Dynamic routing tier selection.
- Per-agent model overrides.
- Runtime-specific agent-launch adapters.

## User Stories

1. As a solo developer, I want planning agents to receive the central model policy's high-reasoning setting so that architecture and plan decomposition use the intended depth.
2. As a solo developer, I want execution agents to receive a different centrally configured reasoning level so that routine implementation work does not consume unnecessary reasoning budget.
3. As a solo developer, I want runtimes that do not support launch-time reasoning effort to ignore the value safely so that my existing installs do not break.

## Acceptance Criteria

- [ ] Resolved model query output includes `reasoning_effort` when the selected runtime and resolved tier support it.
- [ ] Resolved model query output omits `reasoning_effort` when no effort is resolved.
- [ ] Model and `reasoning_effort` resolve from the same central policy source: profile, phase-type map, dynamic routing, or per-agent override.
- [ ] Runtime adapters pass `reasoning_effort` to child-agent launches only when the selected runtime supports launch-time effort.
- [ ] Runtime adapters omit `reasoning_effort` for unsupported runtimes, unknown runtimes, inherited values, and empty values.
- [ ] Existing allowlist behavior prevents user overrides from leaking `reasoning_effort` into unsupported runtimes.
- [ ] Existing model profile behavior remains backward compatible.
- [ ] Tests cover query output, adapter transport, allowlist gating, and tier-source consistency.
- [ ] Documentation explains that effort levels stay centralized in model policy rather than hardcoded in individual workflow prose.

## Which Area Does This Primarily Affect?

Multiple areas: runtime integration, model profile resolution, and workflow agent-launch guidance.

## Applicable Runtimes

All runtimes, with behavior gated by runtime support. Runtimes that do not support launch-time reasoning effort should continue to omit it.

## Breaking Changes Assessment

None expected.

This should be additive and backward compatible:

- Existing configs without `reasoning_effort` continue to work.
- Existing runtimes that do not support launch-time effort omit the field.
- Existing model resolution precedence remains unchanged.
- Existing per-agent and phase-type model policy remains the source of truth.

## Maintenance Burden

- No new dependencies.
- The behavior extends existing model-resolution and runtime-adapter seams.
- Future runtimes that support launch-time effort need to opt in explicitly through the existing support gate.
- Tests must keep model and effort resolution aligned as model-profile features evolve.
- Documentation should clarify the boundary: centralized policy may define task-tailored effort; individual workflow prose should not hardcode one-off effort literals.

## Alternatives Considered

1. Hardcode `reasoning_effort` in individual workflows.
   Rejected because it scatters model policy across workflow prose and causes drift between profiles, phase maps, and actual launches.

2. Leave reasoning effort only in installed runtime config files.
   Rejected because workflows and query surfaces that launch child agents still need to transport the resolved value when the runtime launch API supports it.

3. Add a new parallel configuration system for reasoning effort.
   Rejected because GSD already has model profiles, phase-type maps, dynamic routing, and per-agent overrides. The feature should extend that central policy path, not create a second one.

## Prior Art And References

- #2517 / #2609: runtime-aware model profiles.
- #2612: runtime-aware profiles extended to supported runtimes.
- #3023 / #3030: per-phase-type model map.
- #3230: shared model catalog source of truth.

This proposal is narrower than those efforts. It does not redesign model selection; it transports the already-resolved reasoning effort into supported agent-launch paths.

## Additional Context

The intended policy boundary is:

- Central model policy decides model tier and reasoning effort.
- Workflows request the resolved launch parameters.
- Runtime adapters transport only fields supported by the active runtime.
- Unsupported runtimes omit effort rather than failing or leaking config.
