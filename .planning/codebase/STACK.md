# Technology Stack

**Analysis Date:** 2026-04-14

## Runtime & Language

**Primary:**
- JavaScript (CommonJS `.cjs`) — core library, test suite, installer, scripts
- TypeScript — SDK subdirectory (`sdk/src/**/*.ts`), `vitest.config.ts`

**Runtime:**
- Node.js `>=22.0.0` (engines field in `package.json`)
- CI tests against Node 22 and 24

**Package Manager:**
- npm
- Lockfile: present (`package-lock.json` implied by `npm ci` in CI)

## Frameworks & Libraries

**Core:**
- No application framework — pure Node.js CLI tool

**Test:**
- `vitest ^4.1.2` — SDK unit and integration tests (`sdk/src/**/*.test.ts`)
- Node.js built-in test runner (`node --test`) — main library tests (`tests/*.test.cjs`)
- `c8 ^11.0.0` — coverage instrumentation for built-in runner tests

**Build:**
- `esbuild ^0.24.0` — bundles hooks (`scripts/build-hooks.js` → `prepublishOnly`)

## Build & Tooling

**Build script:** `scripts/build-hooks.js` invoked via `npm run build:hooks`; runs automatically on `prepublishOnly`

**Test runner script:** `scripts/run-tests.cjs` — cross-platform glob resolver for `tests/*.test.cjs`, passes files to `node --test` with concurrency control

**Coverage:**
```bash
npm run test:coverage   # c8 --check-coverage --lines 70 over get-shit-done/bin/lib/*.cjs
```

**Security scripts (bash, run in CI):**
- `scripts/prompt-injection-scan.sh`
- `scripts/base64-scan.sh`
- `scripts/secret-scan.sh`

**No linter or formatter** detected in `devDependencies` or config files.

**TypeScript config:** `tsconfig.json` present at root; `vitest.config.ts` scopes SDK tests under `./sdk`

## Test Framework

**Main library tests:**
- Runner: `node --test` (built-in, Node ≥22)
- Files: `tests/*.test.cjs`
- Concurrency: 4 (default), overridable via `TEST_CONCURRENCY` env var
- Coverage: `c8`, 70% line threshold required

**SDK tests:**
- Runner: `vitest ^4.1.2`
- Unit: `sdk/src/**/*.test.ts`
- Integration: `sdk/src/**/*.integration.test.ts` (120s timeout)

## Infrastructure

**Hosting/Distribution:**
- npm public registry (`https://registry.npmjs.org`)
- Package name: `get-shit-done-cc`
- Published with provenance (`--provenance --access public`)

**Containerization:** Not used

**CI/CD:** GitHub Actions (see INTEGRATIONS.md)

---

*Stack analysis: 2026-04-14*
