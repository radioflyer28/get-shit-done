# Pi + Codex Upstream PR Plan

## Summary

Prepare the current Pi and Codex runtime work for upstream review as three focused Feature Request issues and PRs:

1. Shared model-selection foundation.
2. Pi runtime integration.
3. Codex parallel subagent/runtime updates.

This split follows the upstream contribution rule of one concern per PR while keeping the existing personal integration branch available for local use.

## Upstream Contribution Requirements

- Open Feature Request issues first and wait for the `approved-feature` label before opening PRs.
- Use `.github/PULL_REQUEST_TEMPLATE/feature.md` for each PR.
- Include a closing keyword such as `Closes #NNN` in every PR body.
- Do not open draft PRs.
- Keep each PR scoped to the approved issue.
- Add a `.changeset/*.md` fragment for user-facing changes that touch runtime, installer, workflow, command, agent, hook, or SDK source paths.
- Run focused tests, `npm run lint:tests`, and relevant package/build checks before opening each PR.

## Proposed Issue And PR Split

### 1. Model-Selection Foundation

Purpose: make runtime model tiers capable of carrying runtime-specific metadata without changing existing Claude or Codex behavior.

Scope:

- Extend runtime tier entries to allow optional metadata such as `thinking`.
- Preserve existing `reasoning_effort` behavior for Codex.
- Support runtime-scoped model profile override merging.
- Add regression tests for existing runtime defaults and override behavior.

Out of scope:

- Pi install paths.
- Pi agent conversion.
- Codex parallel subagent workflow changes.

### 2. Pi Runtime Integration

Purpose: add first-class Pi install/runtime support while keeping `pi-subagents` optional.

Scope:

- Add `--pi` installer/runtime handling.
- Install skills and engine files into Pi-compatible global and project paths.
- Convert Claude-style agents into Pi-compatible subagent definitions.
- Inject Pi runtime adapter guidance for `subagent` when available.
- Document optional `pi install npm:pi-subagents` setup.
- Add Pi installer, converter, and workflow adapter tests.

Out of scope:

- Codex-specific parallel subagent prompts.
- Codex model family refresh.

### 3. Codex Parallel Subagent Runtime Updates

Purpose: make GSD skills prompt and use Codex parallel subagents consistently with the Claude runtime behavior.

Scope:

- Add Codex runtime guidance for explicit parallel subagent prompting.
- Cover map, plan, execute, review, docs, and autonomous-style GSD flows where parallelism is already part of the workflow model.
- Refresh Codex default model tiers to the newer GPT/Codex model family names.
- Add tests for the Codex parallel subagent adapter text and existing Codex config behavior.

Out of scope:

- Pi installer/runtime behavior.
- Generic model-selection plumbing already covered by the foundation PR.

## Branch Strategy

- Keep `my-mods` or an equivalent integration branch for personal use and local installs.
- Build upstream PR branches from latest `upstream/main`, not from the personal integration branch.
- Suggested upstream branches:
  - `feat/model-selection-foundation`
  - `feat/pi-runtime`
  - `feat/codex-parallel-subagents`
- Keep `feat/pi-runtime` as the current combined working branch until the split branches are ready.
- Rebase or merge latest `upstream/main` before final validation. Known conflict-prone docs are `docs/CONFIGURATION.md` and `docs/INVENTORY.md`.

## PR Preparation Checklist

- [ ] Create three Feature Request issues with complete specs.
- [ ] Wait for `approved-feature` labels.
- [ ] Split changes into focused branches.
- [ ] Add one changeset fragment per PR branch.
- [ ] Verify no personal fork-only changes are included in upstream PR branches.
- [ ] Fill the Feature PR template with file tables, implementation notes, acceptance criteria, testing, platforms, and runtimes.
- [ ] Include `Closes #NNN` in each PR body.
- [ ] Open non-draft PRs only after tests pass.

## Validation Matrix

Foundation PR:

- Model resolver tests for runtime defaults, override merging, `thinking`, and Codex regression behavior.
- SDK model catalog build/query tests.

Pi PR:

- Pi install tests.
- Pi runtime converter tests.
- Minimal install coverage.
- No Claude path leaks in generated Pi output.
- Focused workflow adapter tests for `gsd-plan-phase` and `gsd-execute-phase`.

Codex PR:

- Codex parallel subagent tests.
- Codex config/runtime tests.
- Existing Codex worktree execution regression tests.

Before every PR:

- Run focused `node --test ...` suites for the branch.
- Run `npm run lint:tests`.
- Run package/build checks required by the touched packages.

## Current Prep Notes

- The current combined work lives on `feat/pi-runtime`.
- The branch already contains Pi runtime work, model-selection changes, Codex model refresh, and Codex parallel subagent changes.
- `tests/codex-parallel-subagents.test.cjs` must use the accepted lint annotation `source-text-is-the-product`.
- Changesets should be created after the branches are split so each PR gets only the fragment that describes its user-facing change.
