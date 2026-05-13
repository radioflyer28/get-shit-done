# Testing

**Analysis Date:** 2026-05-13
**Mapped Commit:** `c582682e`

## Test Frameworks

Root test suite:
- Runner: Node.js built-in test runner through `node --test`.
- Orchestrator: `scripts/run-tests.cjs`.
- Test files: `tests/*.test.cjs`.
- Current count: 501 CJS test files.
- Assertions: `node:assert/strict`.

SDK test suite:
- Runner: Vitest.
- Source: `sdk/src/**/*.test.ts`.
- Config: `sdk/vitest.config.ts` and root `vitest.config.ts`.
- Build: `npm --prefix sdk run build` uses `tsc`.

Coverage:
- `npm run test:coverage`
- Uses `c8 --check-coverage --lines 70`.
- Coverage includes `get-shit-done/bin/lib/*.cjs`, not the entire installer.

## Primary Commands

Root:

```bash
npm test
npm run test:coverage
TEST_CONCURRENCY=1 npm test
node --test tests/pi-install.test.cjs
```

SDK:

```bash
npm --prefix sdk run build
npm --prefix sdk test
npm --prefix sdk test -- src/query/config-query.test.ts
```

Focused branch validation:

```bash
node --test tests/pi-install.test.cjs tests/runtime-converters.test.cjs tests/model-catalog-runtime-defaults.test.cjs
npm --prefix sdk test -- src/query/config-query.test.ts src/query/helpers.test.ts
```

## Test Organization

`tests/` is a flat directory. Important groups:
- Runtime install tests: `pi-install.test.cjs`, `copilot-install.test.cjs`, `codex-config.test.cjs`, `multi-runtime-select.test.cjs`, `install-minimal-all-runtimes.test.cjs`.
- Runtime conversion tests: `runtime-converters.test.cjs`.
- Model routing tests: `issue-2517-runtime-aware-profiles.test.cjs`, `model-catalog-runtime-defaults.test.cjs`.
- Core library tests: `core.test.cjs`, `state.test.cjs`, `phase.test.cjs`, `commands.test.cjs`, `verify.test.cjs`, `config.test.cjs`.
- Security tests: `phase-06-prescan.test.cjs`, `phase10-scanner-operations.test.cjs`, `security-patterns-phase7.test.cjs`, `threat-patterns-validation.test.cjs`, `security.test.cjs`.
- SDK query tests: `sdk/src/query/*.test.ts`.

Large tests by file size include:
- `tests/phase.test.cjs`
- `tests/state.test.cjs`
- `tests/codex-config.test.cjs`
- `tests/core.test.cjs`
- `tests/init.test.cjs`
- `tests/commands.test.cjs`
- `tests/copilot-install.test.cjs`
- `tests/issue-2517-runtime-aware-profiles.test.cjs`

## Helpers

Common CJS helpers live in `tests/helpers.cjs`.

Typical helpers:
- `createTempProject`
- `createTempGitProject`
- `createTempDir`
- `cleanup`
- `runGsdTools`

Use temp projects for tests that write `.planning/` state. Pass `{ HOME: tmpDir }` in env when tests must isolate global defaults.

## Pi Runtime Coverage

Pi-specific coverage exists in:
- `tests/pi-install.test.cjs`
- `tests/runtime-converters.test.cjs`
- `tests/model-catalog-runtime-defaults.test.cjs`
- `tests/issue-2517-runtime-aware-profiles.test.cjs`
- `sdk/src/query/config-query.test.ts`

Covered behavior:
- `--pi --global` and `--pi --local` directory mapping.
- `PI_AGENT_HOME` and `PI_CONFIG_DIR` handling.
- Pi skill frontmatter shape.
- Claude path/reference replacement for Pi.
- Optional `pi-subagents` adapter injection.
- Pi agent frontmatter with no Claude-only fields.
- Pi model/thinking defaults from `openai-codex/...`.
- Runtime tier override merging.

## Codex Model Coverage

Codex model behavior is covered by:
- `tests/issue-2517-runtime-aware-profiles.test.cjs`
- `tests/model-catalog-runtime-defaults.test.cjs`
- `tests/codex-config.test.cjs`
- `sdk/src/query/config-query.test.ts`

Covered behavior:
- `gpt-5.5` high reasoning for `opus`.
- `gpt-5.3-codex` medium reasoning for `sonnet`.
- `gpt-5.4-mini` low reasoning for `haiku`.
- `model_profile_overrides.codex.<tier>` handling.
- object override merging for `reasoning_effort`.
- generated Codex TOML model fields.

## Security Coverage

Security-skills coverage includes:
- `tests/phase-06-prescan.test.cjs`
- `tests/security-patterns-phase7.test.cjs`
- `tests/threat-patterns-validation.test.cjs`
- `tests/phase10-scanner-operations.test.cjs`
- `tests/git-forensics.test.cjs`
- `tests/secure-phase.test.cjs`
- `tests/security.test.cjs`

Covered behavior:
- Prescan shim and Python orchestrator existence/shape.
- Tool registry coverage.
- Scanner workflow integration.
- CI helper behavior and JSON output.
- Baseline suppression and scan state logic.
- Supply-chain intelligence dry-run behavior.
- SBOM script behavior.
- Threat Semgrep rule structure and fixtures.
- Skill audit/tune/scaffold integration.

Some Semgrep execution tests are skipped when the Semgrep CLI is not installed.

## Structural Test Pattern

Many tests assert on source text or generated install output:
- required workflow sections
- frontmatter fields
- absence of forbidden fields such as agent `skills:`
- no hardcoded `~/.claude/` leaks in generated runtime skills
- adapter text presence
- command alias drift
- install manifest contents

This is appropriate for prompt/workflow code, but it means behavior inside real AI runtimes is mostly validated indirectly.

## Known Gaps

Coverage gaps:
- `bin/install.js` has many focused tests but is not part of the `c8` coverage gate.
- Real end-to-end execution inside Pi, Codex, Claude, or other runtimes is not fully automated.
- Optional external scanner CLIs are not always present in CI, so some scanner behavior is structurally validated or skipped.
- Markdown workflow behavior is tested mostly through string/structure assertions, not by executing every workflow.

Risky areas requiring focused tests:
- Adding runtime support in `bin/install.js`.
- Changing model catalog schema.
- Adding or renaming agents.
- Changing `gsd-sdk query` output contracts.
- Editing security scan JSON formats.
- Modifying install profiles or minimal/core behavior.

## Test Expectations For Changes

New runtime:
- Add installer tests for global/local/minimal/full paths.
- Add runtime converter tests.
- Add runtime home tests.
- Add model catalog tests if model defaults exist.
- Add docs table parity tests if runtime defaults are documented.

New agent:
- Add the file in `agents/`.
- Add model metadata in `sdk/shared/model-catalog.json`.
- Ensure `sdk/src/query/config-query.test.ts` model profile parity passes.
- Add workflow/agent structural tests if it has a special contract.

New security scanner capability:
- Add script existence and help tests.
- Add dry-run tests if network/external tools are optional.
- Add fixture-based tests for parsing and JSON shape.
- Avoid requiring external scanners unless the test gracefully skips.

---

*Testing analysis refreshed: 2026-05-13*
