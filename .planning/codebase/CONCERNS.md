# Codebase Concerns

**Analysis Date:** 2026-04-14

---

## Technical Debt

**`bin/install.js` monolith:**
- Issue: Single 5,902-line, 258KB file with 141 functions handles installation, uninstallation, verification, and content conversion for 14 AI runtimes. Every new runtime requires touching ~20+ locations in this file.
- Files: `bin/install.js`
- Impact: High cyclomatic complexity, difficult to reason about, high risk of regressions when editing. The `install()` function sets 13 boolean flags (`isOpencode`, `isGemini`, `isKilo`, `isCodex`, `isCopilot`, `isAntigravity`, `isCursor`, `isWindsurf`, `isAugment`, `isTrae`, `isQwen`, `isCodebuddy`, `isCline`) and branches on them throughout ~300 lines of logic.
- Fix approach: Extract per-runtime conversion modules. Each runtime gets its own `converters/{runtime}.js` with a standard interface. `install()` delegates to the correct converter by name.

**Duplicate todo-listing logic:**
- Issue: Todo parsing/listing code is duplicated between `commands.cjs` (`cmdListTodos`) and `init.cjs` (`cmdInitTodos`). Both read `todos/pending`, parse frontmatter, and build the same data shape.
- Files: `get-shit-done/bin/lib/commands.cjs` (line 73), `get-shit-done/bin/lib/init.cjs` (line 738)
- Impact: Bug fixes or format changes must be applied in two places.
- Fix approach: Extract shared `parseTodos(cwd, area)` helper in a shared utility, consume from both commands.

**Fragile brand-replacement string removal:**
- Issue: Runtime converters remove "Claude Code-specific bug workarounds" via hardcoded regex string replacements before doing brand substitution. Three separate converters (Cursor, Windsurf, Augment) each independently strip the same patterns.
- Files: `bin/install.js` lines 1104, 1222, 1344
- Impact: If the upstream agent markdown text changes slightly, the removal regex silently fails to strip the workaround text, shipping Claude-specific internals into non-Claude installs.
- Fix approach: Centralize workaround removal into one pre-processing pass before any brand conversion. Tag workaround blocks in the source with machine-readable markers instead of matching free-form text.

**`gsd-tools.cjs` generated file in git:**
- Issue: `get-shit-done/bin/gsd-tools.cjs` (52KB) is a generated bundle checked into the repository. Manual edits to it are invisible and will be silently overwritten on the next generation.
- Files: `get-shit-done/bin/gsd-tools.cjs`
- Impact: Developer confusion; no `.gitattributes` or header comment clearly marks it as generated.
- Fix approach: Add a prominent `// THIS FILE IS GENERATED — DO NOT EDIT` header and document the generation command.

---

## Known Gaps

**Security scanner pre-scan architecture not implemented:**
- The fully designed pre-scan orchestration system (bash shim + Python orchestrator running trivy, semgrep, gitleaks, pip-audit, etc. in parallel before the agent runs) is documented but entirely unbuilt.
- Documented in: `get-shit-done/SECURITY-SCANNER-TODO.md` sections 1.1–1.8
- Current state: `/gsd-security-audit` and `/gsd-threat-scan` rely 100% on the AI agent for mechanical pattern scanning — slower, more expensive, less exhaustive than deterministic tools.
- Blocks: Pre-scan result injection into agent context (`<tool_findings>` block), agent role shift from "scan everything" to "analyze + triage."

**Security reference files not yet executable sub-skills:**
- Issue: 20+ language/IaC reference files (python.md, javascript-typescript.md, docker.md, kubernetes.md, etc.) contain passive pattern descriptions but no runnable grep/semgrep/bandit commands.
- Documented in: `get-shit-done/SECURITY-SCANNER-TODO.md` section 2.2
- Impact: Agent must mentally match patterns against code rather than running scripts to get results.

**No scaffolding for new skills:**
- Issue: Adding a new GSD skill requires manually creating a directory under `commands/gsd/` and corresponding `skills/gsd-xxx/SKILL.md` with correct frontmatter. No generator or template tool exists.
- Impact: Inconsistency risk; new skills may diverge from established patterns.

---

## Test Coverage Gaps

**`bin/install.js` excluded from coverage:**
- The `test:coverage` command (`c8 --include 'get-shit-done/bin/lib/*.cjs'`) explicitly covers only lib files. `bin/install.js` — the largest and most critical file at 5,902 lines — has zero measured coverage.
- Files: `bin/install.js`
- Risk: Installation bugs for any of the 14 runtimes go undetected until users report them.

**Coverage threshold is low (70% lines):**
- The only enforced coverage gate is 70% line coverage on lib files. No branch or function coverage is enforced.
- Config: `package.json` `test:coverage` script
- Risk: Large swaths of conditional logic (error paths, edge cases) can be uncovered without failing CI.

**Hooks have no unit tests:**
- `hooks/gsd-statusline.js`, `hooks/gsd-context-monitor.js`, `hooks/gsd-workflow-guard.js`, and others are tested only via smoke tests in install test files — not unit tested for their actual runtime behavior.
- Files: `hooks/*.js`
- Risk: Logic bugs in hook behavior (context monitoring thresholds, prompt guard patterns, status line rendering) are undetected.

**Reactive test pattern (bug-named files):**
- 10 test files are named after bug ticket numbers (bug-1736, bug-1754, bug-1817, bug-1834, bug-1906, bug-1908, bug-1974, bug-1998, bug-2004, bug-2136). These are regression tests created after bugs were found in production.
- Files: `tests/bug-*.test.cjs`
- Risk: Indicates many issues were caught by users, not tests. The underlying behaviors had no proactive test coverage before shipping.

---

## Complexity Hotspots

**`bin/install.js` — entire file:**
- 5,902 lines, 141 top-level functions, 14 runtime targets. The `install()` function at line 5358 is the most complex: sets 13 runtime flags, handles global vs. local install, path resolution for each runtime, content conversion, manifest writing, settings merging, and status line installation.
- Safe modification: Add tests for any new runtime path before touching `install()`. Changes to one runtime's logic can silently affect others due to shared code paths.

**`get-shit-done/bin/lib/init.cjs` (65KB):**
- Central orchestration for the `gsd-tools init` command family. Handles project init, phase init, todos, quick tasks, workstreams, and more. High fan-out across other lib modules.
- Safe modification: Changes here affect almost every GSD workflow invocation.

**`get-shit-done/bin/lib/core.cjs` (64KB) and `state.cjs` (64KB):**
- Core state read/write logic and data transformation. Large files with broad scope. State mutations here affect all phases of the workflow.
- Safe modification: Run full test suite after any changes; these are depended on by nearly every other lib file.

**`get-shit-done/bin/lib/profile-output.cjs` (47KB) and `verify.cjs` (46KB):**
- Both are large single-purpose files. `verify.cjs` implements plan verification logic; `profile-output.cjs` handles output formatting for user-facing reports.
- Risk: Changes to output format in `profile-output.cjs` affect all user-visible output without a stable interface contract.

---

## Dependency Risks

**`vitest` listed but Node built-in test runner is used:**
- `vitest@^4.1.2` is in `devDependencies` but `scripts/run-tests.cjs` invokes `node --test` (Node's built-in test runner), not vitest. The vitest dependency appears unused or aspirational.
- Files: `package.json`, `scripts/run-tests.cjs`
- Risk: Dead dependency inflates install size; causes confusion if contributors try to use vitest features.
- Fix: Remove vitest from `devDependencies` if not needed, or migrate tests to use it.

**`esbuild@^0.24.0` with no explicit build script:**
- `esbuild` is in `devDependencies` but there is no build script that references it by name. `build:hooks` uses plain `fs.copyFile` (no bundling). May be unused or used indirectly.
- Files: `package.json`, `scripts/build-hooks.js`
- Risk: Dead weight if unused; undocumented build step if used.

**`engines: node >=22.0.0` not runtime-enforced:**
- The package specifies Node 22+ but `bin/install.js` does not check `process.version` at startup. Users on older Node versions get cryptic errors rather than a clear version message.
- Files: `bin/install.js`, `package.json`
- Fix: Add a version check at the top of `bin/install.js` with a clear error message.

---

## Scalability Concerns

**Adding new runtimes is additive complexity in one file:**
- Each new AI runtime (e.g., a 15th tool) requires: a new CLI flag, a new boolean constant, a new `convertClaudeTo{Runtime}*` family of functions (typically 4–6 functions), additions to `install()`, `uninstall()`, `verifyInstalled()`, `installAllRuntimes()`, and potentially new test files.
- Current: 14 runtimes, ~141 functions in `install.js`.
- Scaling limit: The file is already at the edge of practical single-file maintenance.

**Test suite concurrency fixed at 4:**
- `run-tests.cjs` uses `--test-concurrency=4` (overridable via `TEST_CONCURRENCY` env var). At 193 tests, this is fine. At 500+ tests, CI times will noticeably increase without parallelism scaling.

**`init.cjs` loaded on every `gsd-tools` invocation:**
- `gsd-tools.cjs` is a monolithic bundle. Even simple commands (e.g., `todo list`) load the entire 65KB `init.cjs` module graph. Startup latency grows as the lib grows.

---

## Maintenance Burden

**Hooks dual-source sync (hooks/ → hooks/dist/):**
- Source hooks live in `hooks/`. The `scripts/build-hooks.js` copies them to `hooks/dist/` for distribution. Must run `npm run build:hooks` before publishing. The `prepublishOnly` hook enforces this for npm publish, but local installs from source (common during dev) may use stale `dist/` files.
- Files: `hooks/*.js`, `hooks/dist/*.js`, `scripts/build-hooks.js`
- Past incidents: build-hooks.js comment references issues #1107, #1109, #1125, #1161 — a duplicate const declaration shipped in dist and broke PostToolUse hooks for all users.
- Risk: Any change to a hook file must be followed by a build step. Forgetting this during development leads to testing against stale hook behavior.
- Fix: Add a dev-time watcher or a pre-test hook that auto-runs `build:hooks` if source and dist diverge.

**Per-runtime conversion function families (14× repetition):**
- Each runtime has a family of 4–6 conversion functions (`convertClaudeTo{Runtime}Markdown`, `convert{Runtime}ToolName`, `convertClaudeCommandTo{Runtime}Skill`, etc.). These functions are largely structurally identical with runtime-specific string substitutions. A bug in the conversion pattern must be fixed in 14 places.
- Files: `bin/install.js` lines ~600–1700
- Fix: Abstract shared conversion logic into a runtime descriptor object pattern; each runtime provides only its diff (tool name map, string replacements, adapter header template).

**Skill files require manual consistency maintenance:**
- 80+ skill SKILL.md files must stay consistent with each other in frontmatter format, mode instructions, and tool usage. No lint or schema validation enforces this at CI time.
- Files: `commands/gsd/*/SKILL.md` (all)
- Risk: Drift between skills goes undetected; inconsistent behavior across commands.

---

*Concerns audit: 2026-04-14*
