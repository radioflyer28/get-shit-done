---
id: SEED-007
status: dormant
planted: 2026-04-14
planted_during: pre-project (no milestone yet)
trigger_when: when improving scanner precision, reducing false positives, or adding language-specific security analysis for a new language
scope: Large
---

# SEED-007: Security Reference Sub-Skills — Evolve Passive Docs to Executable Scan Helpers

## Why This Matters

The security scanner agents currently rely on static reference markdown files that list
vulnerability patterns as human-readable descriptions. The agent reads them and mentally
matches patterns against source code — which is expensive, inconsistent across model runs,
and less precise than deterministic tools.

Evolving each language/IaC reference into a sub-skill that includes executable grep patterns
and semgrep rules means: the scripts do the mechanical matching, the agent reasons about
results. This is the "reference layer" complement to Seed 001's "orchestrator layer" — together
they cover the full spectrum from broad tool-level scanning to language-specific pattern matching.

Pattern quality also improves: community-vetted semgrep rules catch far more than ad-hoc grep,
and having them in the reference file means the agent can emit them directly in the pre-scan
step without needing to construct them from scratch.

## When to Surface

**Trigger:** When we add a new language to security scanning support, start a milestone on
scanner precision/accuracy improvement, or implement SEED-006 (pre-scan orchestrator) — the
executable patterns are what feed into the tool registry.

This seed should be presented during `/gsd-new-milestone` when the milestone scope matches
any of these conditions:
- Milestone adds security analysis for a specific language (Python, JS/TS, Go, etc.)
- Milestone follows completion of SEED-006 (pre-scan orchestrator in place — now layer on per-language rules)
- Milestone reduces scanner false positive rate
- Milestone adds semgrep custom rule support to the GSD scanner

## Scope Estimate

**Large** — 17 language files + 5 IaC/config files to evolve. Phased approach recommended:

**Phase A (highest ROI — most regex-scannable):**
- `python.md` — bandit rules, grep for eval/exec/pickle/yaml.load
- `javascript-typescript.md` — eslint-security rules, grep for eval/innerHTML/dangerouslySetInnerHTML
- `shell-bash.md` — grep for eval, curl|bash, /dev/tcp, base64 decode pipes
- `powershell.md` — grep for Invoke-Expression, -EncodedCommand, download cradles
- `docker.md` — hadolint integration, grep for USER root, ADD vs COPY, --privileged
- `kubernetes.md` — kube-linter rules, grep for privileged/hostNetwork/hostPID
- `terraform.md` — tfsec/checkov rules, grep for hardcoded secrets in .tf

**Phase B (additional language coverage):**
- `go.md`, `java.md`, `c-cpp.md`, `ruby.md`, `php.md`, `rust.md`, `csharp.md`

**Phase C (long tail):**
- `kotlin.md`, `swift.md`, `perl.md`, `lua.md`, `dart-flutter.md`, `html-css.md`
- `ansible.md`, `cloud-init.md`

## Breadcrumbs

Related code and decisions found in the current codebase:

- `agents/gsd-security-scanner.md` — agent that would consume sub-skill output; role shifts to "analyze structured findings + fill gaps"
- `agents/gsd-threat-scanner.md` — same; special handling for `strings` output (suspicious URLs/IPs → C2 contextual analysis)
- `get-shit-done/workflows/security-audit.md` — workflow; sub-skill patterns feed into pre-scan tool registry
- `get-shit-done/workflows/threat-scan.md` — same
- `get-shit-done/references/` — existing references dir; new language files would live here
- `get-shit-done/SECURITY-SCANNER-TODO.md` — full detailed spec (section 2) with per-file task lists and the target sub-skill structure

## Notes

Target structure per language reference file (from TODO section 2.1):

```
## Code Vulnerabilities (OWASP)
- pattern description — explanation

## Quick Scan Scripts

### Grep-Based Detection
```bash
# Command injection via eval
grep -rnE 'eval\s*\(' --include='*.py' .
```

### Semgrep Rules (if available)
```yaml
rules:
  - id: python-eval-injection
    patterns:
      - pattern: eval($X)
    message: "eval() with dynamic input"
    severity: WARNING
    languages: [python]
```
```

This is the "reference layer" — works standalone or alongside SEED-006's orchestrator.
Implementing SEED-006 first is recommended so the patterns have a runtime to execute in.

**Scanner purpose context:** See SEED-006 Notes for canonical scanner purpose definitions.
This seed primarily serves the security audit scanner — deterministic OWASP vulnerability
pattern matching for developers improving their own code. The threat scan analog (deliberately
malicious patterns) lives in SEED-008.
