# Testing

**Analysis Date:** 2026-04-14

## Test Framework

**Runner:** Node.js built-in `node:test` — **do not use Jest, Mocha, Chai, or any external test framework.**

**Assertion Library:** `node:assert/strict`

**Coverage:** `c8` (devDependency) — 70% line coverage minimum enforced on `get-shit-done/bin/lib/*.cjs`

**Required imports:**
```javascript
const { describe, it, test, beforeEach, afterEach, before, after } = require('node:test');
const assert = require('node:assert/strict');
```

**Run Commands:**
```bash
npm test                 # Run all tests (concurrency=4)
npm run test:coverage    # Run with c8 coverage (70% lines required)
TEST_CONCURRENCY=1 npm test  # Run serially (for debugging)
```

The custom runner at `scripts/run-tests.cjs` globs all `tests/*.test.cjs` files and invokes `node --test` with `--test-concurrency=4` by default.

## Test Structure

**Location:** All test files live flat in `tests/` — no subdirectories.

**Naming Pattern:**
- Feature tests: `{feature-name}.test.cjs` (e.g., `agent-frontmatter.test.cjs`, `analyze-dependencies.test.cjs`)
- Bug regression tests: `bug-{issueNumber}-{description}.test.cjs` (e.g., `bug-2075-worktree-deletion-safeguards.test.cjs`)
- Shared utilities: `tests/helpers.cjs` (not a test file; no `.test.` in name)

**Test file count:** 100+ `.test.cjs` files in `tests/`.

**Canonical test structure:**
```javascript
'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createTempProject, cleanup, runGsdTools } = require('./helpers.cjs');

const REPO_ROOT   = path.join(__dirname, '..');
const AGENTS_DIR  = path.join(REPO_ROOT, 'agents');

describe('feature-name', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('does the thing', () => {
    // Arrange
    // Act
    // Assert
    assert.strictEqual(actual, expected);
  });

  test('handles edge case', () => {
    // ...
  });
});
```

**Section dividers** in larger test files use: `// ─── Section Name ─────────────────────`

**Fixture strings** use array `join()`, not template literals (prevents indentation bleed):
```javascript
// GOOD
const content = [
  'line one',
  'line two',
].join('\n');

// BAD — indentation bleeds into string
const content = `
  line one
  line two
`;
```

## Cleanup Patterns

Two approved patterns — no others:

**Pattern 1 — Shared fixtures** (most common):
```javascript
describe('feature', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = createTempProject(); });
  afterEach(() => { cleanup(tmpDir); });

  test('...', () => { /* ... */ });
});
```

**Pattern 2 — Per-test cleanup** (when each test needs unique teardown):
```javascript
test('custom setup', (t) => {
  const tmpDir = createTempProject('my-prefix');
  t.after(() => cleanup(tmpDir));
  assert.strictEqual(actual, expected);
});
```

**Forbidden:** `try/finally` inside test bodies. Only allowed inside standalone utility functions that have no test context access.

## Test Helpers (`tests/helpers.cjs`)

Import from `tests/helpers.cjs`:
```javascript
const { createTempProject, createTempGitProject, createTempDir, cleanup, runGsdTools } = require('./helpers.cjs');
```

| Helper | Creates | Use When |
|--------|---------|----------|
| `createTempProject(prefix?)` | tmpDir + `.planning/phases/` | Testing GSD tools needing planning structure |
| `createTempGitProject(prefix?)` | Same + `git init` + initial commit | Testing git-dependent features |
| `createTempDir(prefix?)` | Bare temp directory | Features not needing `.planning/` |
| `cleanup(tmpDir)` | Removes directory recursively | Always call in `afterEach` |
| `runGsdTools(args, cwd, env?)` | Executes `get-shit-done/bin/gsd-tools.cjs` | Testing CLI commands |

`runGsdTools` accepts a string or array for `args`. Returns `{ success: boolean, output: string, error?: string }`.

Pass `{ HOME: tmpDir }` as `env` to sandbox `~/.gsd/` lookups in tests asserting concrete config values.

## Test Categories

**CLI command tests:** Verify `gsd-tools.cjs` subcommands (`config-ensure-section`, `config-get`, `config-set`, etc.) via `runGsdTools`. Located in files like `analyze-dependencies.test.cjs`, `ai-evals.test.cjs`.

**Agent frontmatter tests** (`agent-frontmatter.test.cjs`): Validate that all agent `.md` files have correct frontmatter — no `skills:` field, anti-heredoc instruction present in file-writing agents, hooks commented out.

**Workflow/command content tests** (`anti-pattern-enforcement.test.cjs`, etc.): Read workflow `.md` files directly and assert on string content — verify required sections, keywords, and structural patterns are present.

**Bug regression tests** (`bug-{N}-*.test.cjs`): Each reproduces a specific reported issue. Named after the GitHub issue number. Required for every bug fix PR — the test must fail before the fix and pass after.

**AI evals tests** (`ai-evals.test.cjs`): Validate AI-integration-specific behavior — config defaults, health check warnings, template section completeness.

**Concurrency/safety tests** (`concurrency-safety.test.cjs`): Test lock file behavior and concurrent access safety.

**Install tests** (`antigravity-install.test.cjs`, `bug-1736-local-install-commands.test.cjs`): Validate installer behavior across runtimes.

## Coverage Areas

**Well tested:**
- `get-shit-done/bin/lib/*.cjs` — core library modules (70% line coverage enforced by CI)
- CLI command output and return values via `runGsdTools`
- Agent and command frontmatter structural requirements
- Workflow file content (required sections, keywords, anti-patterns)
- Config read/write/validate operations
- Bug regression coverage (100+ filed bugs have corresponding tests)

**Gaps:**
- Workflow behavior end-to-end (workflows are tested structurally/textually, not by executing them in an AI runtime)
- `bin/install.js` — installer logic partially tested (some install tests exist but coverage is not enforced)
- Edge cases in `agents/` and `commands/gsd/` content beyond frontmatter checks

## Node Version Compatibility

| Version | Status |
|---------|--------|
| **Node 22** | Minimum required (Active LTS until Oct 2026) |
| **Node 24** | Primary CI target |

**CI matrix:** Ubuntu × Node 22, 24; macOS × Node 24. All jobs must be green before merge.

Do not use APIs unavailable in Node 22. Safe to use: `node:test`, `describe`/`it`/`test`, `beforeEach`/`afterEach`, `t.after()`, `t.plan()`, snapshot testing.

## Test Requirements by Contribution Type

| Type | Requirement |
|------|-------------|
| **Bug Fix** | Regression test required — must fail before fix, pass after |
| **Enhancement** | Tests for enhanced behavior + update affected existing tests |
| **Feature** | Tests for primary success path + at least one failure scenario |
| **Behavior Change** | Update or replace all tests covering changed behavior |
