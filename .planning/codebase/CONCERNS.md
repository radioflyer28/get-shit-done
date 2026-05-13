# Codebase Concerns

**Analysis Date:** 2026-05-13
**Mapped Commit:** `c582682e`

## Highest-Risk Areas

### `bin/install.js` remains the central complexity hotspot

`bin/install.js` is about 10,152 lines and owns runtime selection, conversion, install, uninstall, manifest generation, SDK checks, and runtime-specific config. Adding Pi increased the runtime matrix and introduced another agent conversion path.

Risk:
- A change intended for one runtime can regress another runtime through shared staging/conversion code.
- Help text, runtime flags, install-all coverage, uninstall logic, and runtime home resolution can drift.
- Many conversion helpers are still co-located in one file.

Mitigation:
- Keep adding focused runtime tests such as `tests/pi-install.test.cjs` and `tests/runtime-converters.test.cjs`.
- Prefer extracting small shared modules when possible, following existing seams such as `get-shit-done/bin/lib/runtime-homes.cjs`, `install-profiles.cjs`, and `model-catalog.cjs`.

### Runtime conversion is powerful but fragile

Runtime-specific generation performs text transformations:
- Claude references to runtime-neutral names.
- `CLAUDE.md` and `.claude` path replacements.
- frontmatter conversion for Pi, Codex, OpenCode, Gemini, Kilo, and others.
- tool allowlist conversion or omission.

Risk:
- Free-form Markdown changes can bypass string replacements.
- Runtime-specific adapters can become stale as workflow text evolves.
- False positives can rewrite examples that intentionally mention another runtime.

Mitigation:
- Continue structural leak tests such as no hardcoded `~/.claude/` in generated skills.
- Prefer marked adapter blocks over broad regexes.
- Add snapshot-like tests for representative workflows and agents per runtime.

### Model catalog is now a critical shared contract

`sdk/shared/model-catalog.json` is consumed by both CJS and SDK code. It now carries runtime tier defaults, agent metadata, phase types, and routing tiers.

Risk:
- Adding an agent without catalog metadata breaks SDK profile parity.
- Adding a runtime without docs/tests can create silent default gaps.
- `reasoning_effort` and `thinking` are runtime-specific and should not leak into the wrong runtime.

Mitigation:
- Keep `tests/model-catalog-runtime-defaults.test.cjs`.
- Keep SDK parity tests in `sdk/src/query/config-query.test.ts`.
- Add every new agent to the catalog in the same PR that adds the file.

## Security Concerns

### Security tooling invokes optional external programs

Security workflows may invoke Semgrep, Gitleaks, Trivy, Syft, CycloneDX, Python, and Bash depending on the mode.

Risk:
- Tool absence can reduce scan coverage.
- Tool output formats can change.
- Windows shell behavior differs from Linux/macOS behavior.

Mitigation:
- Keep graceful skip/dry-run behavior.
- Preserve JSON-normalized findings contracts.
- Keep unit tests around stdlib helpers and workflow text.
- Document optional tools clearly in security workflows.

### Supply-chain intelligence can touch external APIs

`get-shit-done/bin/supply_chain_intel.py` references OSV, deps.dev, and GitHub Advisory GraphQL.

Risk:
- Network failures and rate limits can create noisy or slow scans.
- API schema changes can break enrichment.

Mitigation:
- Keep dry-run mode and graceful no-lockfile behavior.
- Ensure security workflows can proceed with partial findings.
- Avoid making network enrichment a hard requirement for local security scans.

### Threat scan must handle untrusted code safely

`get-shit-done/workflows/threat-scan.md` and `agents/gsd-threat-scanner.md` are intended for potentially malicious repositories.

Risk:
- Prompt injection via source files, commit messages, package scripts, or encoded payloads.
- Accidental execution of untrusted scripts.
- Writing malicious content into committed artifacts.

Mitigation:
- Keep threat scan read-only unless explicit quarantine/remediation workflows are used.
- Preserve git forensics and Semgrep pre-scan isolation.
- Keep prompt-injection and base64 scan tests.

## Technical Debt

### Large CommonJS modules

The largest runtime libraries are broad and highly coupled:
- `get-shit-done/bin/lib/core.cjs`
- `get-shit-done/bin/lib/init.cjs`
- `get-shit-done/bin/lib/state.cjs`
- `get-shit-done/bin/lib/verify.cjs`
- `get-shit-done/bin/lib/phase.cjs`
- `get-shit-done/bin/lib/profile-output.cjs`

Risk:
- Changes have wide blast radius.
- It is easy to add new behavior to existing large modules instead of creating clearer modules.

Mitigation:
- Follow newer extraction patterns such as `model-catalog.cjs`, `runtime-homes.cjs`, `install-profiles.cjs`, `shell-command-projection.cjs`, and `surface.cjs`.
- Add focused tests before modifying large modules.

### Generated/bundled file clarity

`get-shit-done/bin/gsd-tools.cjs` is a shipped helper file. It should be treated as a compatibility surface; manual edits can drift from modular source behavior.

Risk:
- CJS and SDK query behavior can diverge.
- Workflows may call either `gsd-tools` compatibility paths or `gsd-sdk query` paths.

Mitigation:
- Prefer new workflow logic through `gsd-sdk query`.
- Keep parity tests for critical query behavior.

### Workflow count increases maintenance load

There are 109 workflow files and 72 command files. Many encode similar runtime adapter instructions, subagent patterns, and shell snippets.

Risk:
- Repeated instructions drift.
- Fixes must be applied across many files.
- Runtime-specific notes can become stale.

Mitigation:
- Centralize reusable guidance in references and installed skill adapters.
- Use lint tests such as `lint-skill-deps` and command alias drift checks.
- Prefer shared query handlers over inline shell parsing.

## Runtime-Specific Risks

### Pi parallelism depends on optional `pi-subagents`

Pi support is designed to use `pi-subagents` when the `subagent` tool is available, but to fall back otherwise.

Risk:
- Users may expect parallel GSD execution without installing `pi-subagents`.
- Workflows may accidentally assume the Pi subagent tool exists.

Mitigation:
- Keep adapter wording explicit: missing `subagent` is not fatal.
- Keep sequential fallback paths valid.
- Add more tests for generated Pi skill text around fallback behavior.

### Codex global SDK path can become stale

GSD workflows call `gsd-sdk query ...`. If PATH resolves an old global `gsd-sdk`, installed workflows can fail even when runtime files are current.

Risk:
- User sees a successful install but workflows call stale query handlers.

Mitigation:
- Installer now checks SDK readiness and version mismatch.
- For source installs, globally link the current package or ensure the installed `sdk/dist/cli.js` is first in PATH.

## Test Coverage Gaps

### Installer coverage is focused, not measured by c8

`bin/install.js` has many targeted tests but is not included in the `c8` line coverage target.

Risk:
- Large runtime branches may remain uncovered.

Mitigation:
- Keep adding focused installer tests by runtime and feature.
- Consider extracting converter modules into testable libraries.

### Real-runtime E2E is mostly manual

Pi, Codex, Claude, and other runtimes are validated through generated files and smoke installs, not by driving each UI/CLI through a full GSD workflow in CI.

Risk:
- A generated skill can pass structure tests but still be awkward or broken inside the actual runtime.

Mitigation:
- Add lightweight manual checklists in docs.
- Capture runtime-specific failures as regression tests in converter/installer layers.

### Optional scanner CLI tests skip

Semgrep-dependent tests skip when Semgrep is missing.

Risk:
- Rule syntax drift may be missed in environments without Semgrep.

Mitigation:
- Keep structural validation tests.
- Run full scanner validation in an environment with Semgrep before security releases.

## Mergeability Concerns

The fork intentionally keeps:
- `feat/pi-runtime`
- `feat/security-skills`
- aggregate `my-mods`

Risk:
- Integration-only fixes can land only in `my-mods`, leaving topic branches independently broken.

Mitigation:
- Put ownership fixes into the owning topic branch first.
- Merge topic branches into `my-mods` after each update.
- Regularly merge `upstream/main` into both topic branches.

## Watch List

Watch these files during future changes:
- `bin/install.js`
- `sdk/shared/model-catalog.json`
- `get-shit-done/bin/lib/model-catalog.cjs`
- `sdk/src/model-catalog.ts`
- `get-shit-done/workflows/execute-phase.md`
- `get-shit-done/workflows/map-codebase.md`
- `get-shit-done/workflows/security-audit.md`
- `get-shit-done/workflows/threat-scan.md`
- `agents/gsd-security-scanner.md`
- `agents/gsd-threat-scanner.md`
- `tests/pi-install.test.cjs`
- `tests/issue-2517-runtime-aware-profiles.test.cjs`
- `sdk/src/query/config-query.test.ts`

---

*Concerns audit refreshed: 2026-05-13*
