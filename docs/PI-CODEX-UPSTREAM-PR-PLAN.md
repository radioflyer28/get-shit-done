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

## Upstream Overlap Review

Relevant prior work:

- #767, closed: earlier Pi support PR. Closed as stale after the codebase evolved; maintainer noted `gsd-2` exists and is based on the Pi Dev tool.
- #1405, closed with changes requested: broader Pi integration was rejected for duplicated Pi agents, undocumented Pi extension APIs, MCP/security surface, package/dependency changes, unstable history, and structural-only tests.
- #2517/#2609, merged: runtime-aware model profiles for Codex/non-Claude runtimes.
- #2612, merged: runtime-aware profiles extended to supported runtimes.
- #3023/#3030, merged: per-phase-type model map.
- #3230, merged: shared model catalog source of truth.
- #791, merged: Codex request-user-input and multi-agent support.
- #3360/#3365, closed/merged: Codex execute-phase subagents and unsupported worktree behavior.
- #3377, open: runtime install policy refactor. This will likely conflict with Pi installer plumbing and should be allowed to settle before final Pi branch split.

Adjusted positioning:

- Do not submit a broad "model selection" Feature Request; that duplicates merged work. Submit a narrow runtime model metadata extension only if maintainers want it split from Pi.
- Do not duplicate Pi agents by hand. Generate Pi-compatible agents from canonical GSD agents.
- Do not add Pi extensions, MCP servers, new package dependencies, or package metadata changes unless maintainers explicitly request them.
- Do not claim Codex subagent infrastructure is new. Frame the Codex proposal as GSD workflow/adapter parity that uses existing Codex `spawn_agent` / `wait_agent` capability with explicit user authorization.
- Wait for or rebase over #3377 before finalizing installer-heavy Pi changes.

## Proposed Issue And PR Split

### 1. Runtime Model Metadata Foundation

Purpose: make runtime model tiers capable of carrying narrow runtime-specific metadata, such as Pi `thinking`, without reopening the already-merged runtime-aware model profile design.

Scope:

- Extend runtime tier entries to allow optional metadata such as `thinking`.
- Preserve existing `reasoning_effort` behavior for Codex.
- Support runtime-scoped model profile override merging.
- Add regression tests for existing runtime defaults and override behavior.

Out of scope:

- Pi install paths.
- Pi agent conversion.
- Codex parallel subagent workflow changes.

Draft Feature Request outline:

- Problem: runtime-specific model resolution already supports runtime-aware models and Codex `reasoning_effort`, but has no generic place to carry Pi-style thinking metadata.
- Addition: allow runtime tier entries and runtime-scoped overrides to carry optional runtime metadata while preserving existing Claude and Codex behavior.
- Acceptance: model resolution returns metadata only for runtimes that declare it, Codex `reasoning_effort` behavior is unchanged, and unknown runtimes remain safe.
- Maintenance burden: low; this extends the existing model-catalog/resolver seam created by #3230 instead of adding a new configuration path.
- Prior-art note: reference #2517, #2612, #3023, and #3230 as existing model work; this issue is only the missing metadata field needed for Pi.

### 2. Pi Runtime Integration

Purpose: add first-class Pi install/runtime support while keeping `pi-subagents` optional.

Scope:

- Add `--pi` installer/runtime handling.
- Install skills and engine files into Pi-compatible global and project paths.
- Convert Claude-style agents into Pi-compatible subagent definitions.
- Inject Pi runtime adapter guidance for `subagent` when available.
- Document optional `pi install npm:pi-subagents` setup.
- Add Pi installer, converter, and workflow adapter tests.
- Rebase over or adapt to #3377's runtime install policy module if it merges first.

Out of scope:

- Codex-specific parallel subagent prompts.
- Codex model family refresh.
- Hand-maintained duplicate `.pi/agents`.
- Pi extensions, MCP servers, extra TypeScript dependencies, or package publishing metadata changes.

Draft Feature Request outline:

- Problem: Pi users cannot install GSD into Pi-native paths or use GSD's agent-heavy workflows through Pi-compatible subagents.
- Addition: add `--pi` install/runtime support, Pi skill/engine paths, Pi agent conversion, and optional `pi-subagents` adapter guidance.
- Acceptance: global and local Pi installs work, generated Pi agents avoid Claude-only frontmatter, Pi skills avoid Claude path leaks, and workflows fall back sequentially when `subagent` is unavailable.
- Maintenance burden: moderate; the implementation should stay centralized in installer/runtime conversion code and avoid hand-editing every skill.
- Prior-art note: explicitly differs from #1405 by generating from canonical agents, avoiding Pi extensions/MCP, avoiding new dependencies, and adding behavioral install/conversion tests.

### 3. Codex Parallel Subagent Runtime Updates

Purpose: make GSD skills prompt and use existing Codex parallel subagent tools consistently with the Claude runtime behavior, while preserving Codex's explicit-authorization requirement.

Scope:

- Add Codex runtime guidance for explicit parallel subagent prompting.
- Cover map, plan, execute, review, docs, and autonomous-style GSD flows where parallelism is already part of the workflow model.
- Refresh Codex default model tiers to the newer GPT/Codex model family names.
- Add tests for the Codex parallel subagent adapter text and existing Codex config behavior.
- Avoid changing Codex worktree semantics already handled by #3360/#3365 unless a new approved issue asks for that.

Out of scope:

- Pi installer/runtime behavior.
- Generic model-selection plumbing already covered by the foundation PR.
- Adding Codex subagent infrastructure; #791 already established Codex multi-agent capability.

Draft Feature Request outline:

- Problem: GSD workflows that are parallel in Claude currently degrade to sequential behavior in Codex even when Codex subagent tools are available.
- Addition: add Codex runtime guidance for explicit `spawn_agent`/`wait_agent` parallelism, proactive user confirmation prompts, and refreshed Codex model tier defaults.
- Acceptance: map-codebase/docs-update style workflows can use Codex parallel subagents only after explicit user authorization, sequential fallback remains available, and model defaults resolve to the newer GPT/Codex family names.
- Maintenance burden: moderate; changes should remain in central adapter text plus the few workflows whose parallel behavior is already explicit.
- Prior-art note: reference #791 as the underlying Codex capability and #3360/#3365 as worktree-related boundaries not reopened here.

## Branch Strategy

- Keep `my-mods` or an equivalent integration branch for personal use and local installs.
- Build upstream PR branches from latest `upstream/main`, not from the personal integration branch.
- Suggested upstream branches:
  - `feat/model-selection-foundation`
  - `feat/pi-runtime`
  - `feat/codex-parallel-subagents`
- Keep `feat/pi-runtime` as the current combined working branch until the split branches are ready.
- Rebase or merge latest `upstream/main` before final validation. Known conflict-prone docs are `docs/CONFIGURATION.md` and `docs/INVENTORY.md`.
- If #3377 merges first, rebuild the Pi branch on the new runtime install policy seam rather than preserving older installer branching.

## PR Preparation Checklist

- [ ] Draft issue text locally for review before creating GitHub issues.
- [ ] Draft PR bodies locally for review before opening GitHub PRs.
- [ ] Re-check upstream issues/PRs immediately before submission.
- [ ] Confirm #3377 status and adapt Pi installer changes if it merged.
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
- Do not submit GitHub issues or PRs until the draft issue text and PR bodies have been reviewed.
