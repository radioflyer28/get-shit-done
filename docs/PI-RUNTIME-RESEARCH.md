# Pi Runtime Research Note

**Scope:** second-round Pi support for GSD skills, agents, parallel workflows, and task-tailored model selection.

## Canonical Sources

- Pi Skills: `https://pi.dev/docs/latest/skills`
- Pi Packages: `https://pi.dev/docs/latest/packages`
- Pi Settings: `https://pi.dev/docs/latest/settings`
- Pi Custom Models: `https://pi.dev/docs/latest/models`
- pi-subagents package: `https://pi.dev/packages/pi-subagents`

## Contract Summary

- Pi loads global skills from `~/.pi/agent/skills/` and project skills from `.pi/skills/`.
- Pi packages are installed explicitly with `pi install npm:<package>`; GSD must not install third-party Pi packages as a side effect.
- `pi-subagents` discovers user agents from `~/.pi/agent/agents/**/*.md` and project agents from `.pi/agents/**/*.md`.
- `pi-subagents` supports single agents, grouped parallel tasks, async/background runs, status polling, worktree isolation, `model`, and `thinking`.
- If the `subagent` tool is unavailable, GSD workflows should fall back to their existing sequential inline behavior.

## Local Seams

- `bin/install.js` owns runtime path selection, skill conversion, engine copy, and agent conversion.
- `sdk/shared/model-catalog.json` is the shared runtime tier map consumed by CJS and SDK code.
- `get-shit-done/bin/lib/core.cjs` resolves runtime tier entries at workflow time.
- `sdk/src/query/config-query.ts` exposes `resolve-model` to workflows and SDK consumers.
- GSD workflows still use Claude-native `Agent(...)`, `run_in_background`, and `TaskOutput` vocabulary; Pi support is injected through install-time adapter text instead of editing each workflow copy.
