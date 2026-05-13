# Pi + Codex Upstream PR Plan

## Summary

Prepare the current Pi and Codex runtime work for upstream review as three focused Feature Request issues and PRs:

1. Agent-launch reasoning transport.
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
- #2517/#2609, merged: runtime-aware model profiles for Codex/non-Claude runtimes, including Codex `reasoning_effort` resolution.
- #2612, merged: runtime-aware profiles extended to supported runtimes.
- #3023/#3030, merged: per-phase-type model map.
- #3230, merged: shared model catalog source of truth.
- #791, merged: Codex request-user-input and multi-agent support.
- #3360/#3365, closed/merged: Codex execute-phase subagents and unsupported worktree behavior.
- #3377, open: runtime install policy refactor. This will likely conflict with Pi installer plumbing and should be allowed to settle before final Pi branch split.

Adjusted positioning:

- Do not submit a broad "model selection" Feature Request; that duplicates merged work. Submit a narrow agent-launch metadata transport issue so resolved `reasoning_effort` reaches subagent dispatch where the runtime supports it.
- Do not duplicate Pi agents by hand. Generate Pi-compatible agents from canonical GSD agents.
- Do not add Pi extensions, MCP servers, new package dependencies, or package metadata changes unless maintainers explicitly request them.
- Do not claim Codex subagent infrastructure is new. Frame the Codex proposal as GSD workflow/adapter parity that uses existing Codex `spawn_agent` / `wait_agent` capability with explicit user authorization.
- Wait for or rebase over #3377 before finalizing installer-heavy Pi changes.

## Proposed Issue And PR Split

### 1. Agent-Launch Reasoning Transport

Purpose: ensure the reasoning effort already resolved by GSD reaches agent/subagent launch paths where the runtime accepts it, without reopening the already-merged runtime-aware model profile design.

Scope:

- Preserve existing Codex `reasoning_effort` resolution and allowlist behavior.
- Extend `gsd-sdk query resolve-model` / command query output to include `reasoning_effort` when resolved for the selected runtime.
- Update runtime adapters that translate GSD `Agent()`/`Task()` calls to pass `reasoning_effort` into child-agent launch calls only when the runtime supports it.
- Keep Pi thinking as Pi-native launch/runtime behavior, not a new generic GSD catalog field unless maintainers explicitly request that abstraction.
- Add regression tests that resolved model and reasoning effort derive from the same tier source and are both available to launch adapters.

Out of scope:

- Pi install paths.
- Pi agent conversion.
- Codex parallel subagent workflow changes.
- Broad model-selection redesign.
- Adding `thinking` as a generic model-catalog field unless a maintainer asks for it.

Draft Feature Request outline:

- Problem: GSD can resolve Codex `reasoning_effort`, but upstream launch/query paths do not consistently expose or pass that effort when starting child agents/subagents.
- Addition: expose resolved `reasoning_effort` alongside resolved model IDs and teach runtime launch adapters to pass it only for runtimes that support it.
- Acceptance: Codex model and reasoning effort still resolve from the same profile/phase/dynamic-routing tier, unknown runtimes cannot receive effort by override leakage, and launch adapter text/tests show effort is passed when supported.
- Maintenance burden: low; this uses the existing resolver/model-catalog seam created by #3230 and avoids a new model configuration surface.
- Prior-art note: reference #2517, #2612, #3023, and #3230 as existing model work; this issue only closes the transport gap between resolution and subagent launch.

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
- Use existing model ID resolution for Pi model selection.
- Map GSD tier intent to Pi-native `thinking` only inside Pi install/agent adapter behavior if needed for `pi-subagents`.

Out of scope:

- Codex-specific parallel subagent prompts.
- Codex model family refresh.
- Hand-maintained duplicate `.pi/agents`.
- Pi extensions, MCP servers, extra TypeScript dependencies, or package publishing metadata changes.
- A generic `thinking` field in shared GSD model configuration unless maintainers explicitly request it.

Draft Feature Request outline:

- Problem: Pi users cannot install GSD into Pi-native paths or use GSD's agent-heavy workflows through Pi-compatible subagents.
- Addition: add `--pi` install/runtime support, Pi skill/engine paths, Pi agent conversion, existing model ID resolution, Pi-native thinking mapping where applicable, and optional `pi-subagents` adapter guidance.
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
  - `feat/agent-launch-reasoning-transport`
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

Reasoning Transport PR:

- Model resolver tests for runtime defaults, override merging, `reasoning_effort`, and Codex regression behavior.
- SDK model query tests proving `resolve-model` exposes `reasoning_effort` when supported.
- Adapter tests proving launch guidance passes `reasoning_effort` only for supported runtimes.

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
- The branch already contains Pi runtime work, reasoning transport changes, Codex model refresh, and Codex parallel subagent changes.
- `tests/codex-parallel-subagents.test.cjs` must use the accepted lint annotation `source-text-is-the-product`.
- Changesets should be created after the branches are split so each PR gets only the fragment that describes its user-facing change.
- Do not submit GitHub issues or PRs until the draft issue text and PR bodies have been reviewed.
