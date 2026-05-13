# Feature Request Draft: Pi Runtime Interoperability For GSD v1 Projects

> Draft only. Do not submit until reviewed.

## Pre-submission checklist

- [x] I have searched existing issues and discussions — this has not been proposed and declined before.
- [x] I have read CONTRIBUTING.md and understand that I must wait for `approved-feature` before writing any code.
- [x] I have read the existing GSD commands and workflows and confirmed this feature does not duplicate existing behavior.
- [x] This feature solves a problem for solo developers using AI coding tools, not a personal preference or workflow I happen to like.

## Feature name

Pi Runtime Interoperability For GSD v1 Projects

## Type of addition

New runtime integration.

## The Solo Developer Problem

Some teams and open-source projects already use GSD v1 `.planning/` artifacts as shared project context. A developer who prefers Pi cannot currently install and use GSD v1 in Pi-native paths, which makes it harder to participate in those codebases without switching tools or asking the team to migrate.

The problem is not that Pi lacks its own workflow direction. The problem is interoperability: a Pi user should be able to work on the same repository, read and update the same `.planning/` artifacts, and use the same GSD v1 workflows as collaborators using other GSD v1 runtimes.

Forcing Pi users to convert a GSD v1 project to GSDv2 just to get work done would be an undue burden for mixed-runtime teams. It also creates a collaboration dead end: once work happens in GSDv2 artifacts, there is no guaranteed path back to the GSD v1 `.planning/` artifacts that other developers in the repository still use.

## What This Feature Adds

This feature adds a lightweight Pi compatibility layer for GSD v1 projects.

It adds behavior so that:

1. The installer accepts `--pi` for global and local installs.
2. GSD skills and engine files are installed into Pi-compatible global and project paths.
3. Canonical GSD agent definitions are converted into Pi-compatible subagent definitions at install time.
4. GSD skill/workflow text uses Pi-compatible project instruction/path vocabulary where needed.
5. Existing GSD v1 `.planning/` artifacts remain the canonical project state.
6. Optional `pi-subagents` support is documented and used only when Pi exposes the `subagent` tool; missing `subagent` support falls back to sequential inline workflow behavior.

Example usage:

```bash
npx get-shit-done-cc@latest --pi --global
```

Then in Pi:

```text
/skill:gsd-new-project
```

## Full Scope Of Changes

Files or systems likely modified:

- Installer runtime selection and path handling for a `pi` runtime.
- Runtime home/path helpers for Pi global and local install locations.
- Runtime conversion logic that generates Pi-compatible skills and agents from canonical GSD sources.
- Runtime adapter guidance for optional `pi-subagents` usage and sequential fallback.
- Documentation describing Pi installation, optional `pi-subagents`, and `.planning/` interoperability.
- Tests for Pi path mapping, install/uninstall, generated skill/agent output, and fallback behavior.
- Changeset fragment for user-visible Pi runtime support.

Systems affected:

- Installer/runtime selection.
- Skill installation.
- Agent conversion.
- Runtime path rewriting.
- Existing GSD v1 `.planning/` workflows.

## User Stories

1. As a developer using Pi, I want to install GSD v1 into Pi-native paths so that I can work in a repository that already uses `.planning/` artifacts.
2. As a maintainer of a GSD v1 project, I want Pi users to use the same GSD workflows and `.planning/` state as everyone else so that team context does not split across tools.
3. As a Pi user without `pi-subagents` installed, I want GSD workflows to fall back sequentially so that GSD remains usable without extra packages.

## Acceptance Criteria

- [ ] `npx get-shit-done-cc@latest --pi --global` installs GSD into Pi-compatible global paths.
- [ ] `npx get-shit-done-cc@latest --pi --local` installs GSD into Pi-compatible project paths.
- [ ] Installed Pi skills reference Pi-compatible paths and project instruction files where applicable.
- [ ] Generated Pi agents are derived from canonical GSD agents rather than hand-maintained duplicates.
- [ ] Generated Pi agents omit Claude-only frontmatter and tool fields that Pi does not support.
- [ ] Existing GSD v1 `.planning/` artifacts remain unchanged and canonical.
- [ ] `pi-subagents` is optional; if the `subagent` tool is unavailable, workflows use existing sequential fallback behavior.
- [ ] No Pi extensions, MCP servers, TypeScript extension dependencies, or package publishing metadata are added.
- [ ] Tests cover installer paths, install/uninstall behavior, generated agent conversion, path/reference rewriting, and optional subagent fallback guidance.
- [ ] Existing non-Pi runtime behavior remains unchanged.

## Which Area Does This Primarily Affect?

Multiple areas: runtime integration, installation/setup, and existing workflow compatibility.

## Applicable Runtimes

- [x] Other: Pi

## Breaking Changes Assessment

None expected.

This should be additive and backward compatible:

- Existing runtimes keep their current install paths and generated files.
- Existing `.planning/` artifacts are not migrated or rewritten.
- Pi-specific behavior is only used when the installer/runtime is explicitly set to `pi`.
- Missing optional `pi-subagents` support falls back sequentially rather than failing.

## Maintenance Burden

- No new dependencies.
- No Pi extensions, MCP servers, or package metadata changes.
- No hand-maintained duplicate Pi agent library.
- Pi output should be generated from canonical GSD skills and agents at install time.
- Ongoing maintenance should be limited to the same runtime conversion seams used by other supported runtimes.
- If Pi changes its skill or subagent file format, only the Pi conversion adapter should need updates.

## Alternatives Considered

1. Use GSDv2 instead of adding GSD v1 Pi support.
   GSDv2 may be a good Pi-native path for some users, but it does not solve interoperability for repositories and teams already standardized on GSD v1 `.planning/` artifacts. Requiring conversion would force Pi users onto a different artifact format and leave no guaranteed way to push their work back as GSD v1 planning state for collaborators.

2. Maintain separate Pi-native copies of every GSD agent and workflow.
   Rejected because prior review feedback flagged duplicate agents as a drift risk. Generated conversion from canonical GSD sources is lower maintenance.

3. Add Pi extensions, MCP servers, or TypeScript support code.
   Rejected because prior Pi integration review flagged undocumented extension APIs, MCP/security surface, and extra dependencies as maintenance and security risks.

4. Automatically install `pi-subagents`.
   Rejected because the GSD installer should avoid network/package-manager side effects. Users can install optional packages themselves.

## Prior Art And References

- #767: earlier Pi support PR, closed as stale after the codebase evolved.
- #1405: broader Pi integration PR, closed with changes requested.

This proposal is narrower than those attempts. It focuses on GSD v1 `.planning/` interoperability, generated runtime conversion, no new dependencies, no extension/MCP surface, and behavioral install/conversion tests.

## Additional Context

This is not intended to compete with or replace GSDv2. The goal is compatibility for GSD v1 users and teams:

- Pi users can participate in GSD v1 repositories.
- `.planning/` remains the shared source of project state.
- Pi users are not forced to convert project state to GSDv2 just to contribute.
- Work done from Pi remains shareable with teammates who continue using GSD v1 artifacts.
- Runtime-specific behavior stays in installer/converter seams.
- Optional subagent support improves ergonomics when available but is not required.
