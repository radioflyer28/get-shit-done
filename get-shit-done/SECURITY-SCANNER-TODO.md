# Security & Threat Scanner — Future Work

> Captured from session on 2026-04-10. Covers efficiency improvements, sub-skill architecture,
> and tooling integration for `/gsd-security-audit` and `/gsd-threat-scan`.

---

## 1. Pre-Scan Script Architecture

**Goal:** Offload ~60% of mechanical agent work to deterministic tools that run faster, cheaper,
and more exhaustively. Agent shifts from "scan everything" to "analyze structured findings + add
business logic reasoning."

### 1.1 Create Pre-Scan Orchestrator (Hybrid Architecture)

**Design:** Thin bash shim → Python orchestrator. Bash handles portability ("can I run?"),
Python handles structured data (JSON normalization, parallel execution, result merging).

#### Bash Shim: `.github/get-shit-done/bin/security-prescan.sh` (~30 lines)

- [ ] Create bash shim entry point
  - Detect Python 3: `command -v python3 || command -v uvx` (can `uvx python`)
  - Detect ephemeral runners: `uvx`, `npx`, `nix run` — export as env vars for Python
  - Detect direct tool binaries: `command -v trivy`, `command -v hadolint`, etc.
  - Export `PRESCAN_RUNNERS=uvx,npx,nix` and `PRESCAN_TOOLS=trivy,hadolint,...` as
    comma-separated lists so Python doesn't need to re-probe
  - Invoke: `python3 "$(dirname "$0")/security_prescan.py" "$@"` (or `uvx` fallback)
  - If Python unavailable: print clear error + exit 1

#### Python Orchestrator: `.github/get-shit-done/bin/security_prescan.py`

- [ ] Create Python orchestrator (stdlib only — no pip dependencies)
  - Read available runners/tools from env vars set by bash shim
  - Define tool registry: each tool has ecosystem, runner preference order, CLI args,
    output parser (JSON/SARIF/text)
  - Run tools in parallel via `concurrent.futures.ProcessPoolExecutor`
  - Each tool runner: build command (select best available runner), capture stdout/stderr,
    parse output into normalized finding dicts
  - Merge all findings into unified `PRE-SCAN-RESULTS.json` with schema:
    ```json
    {
      "meta": { "timestamp": "...", "tools_run": [...], "tools_skipped": [...] },
      "findings": [
        { "tool": "...", "severity": "...", "file": "...", "line": N,
          "rule": "...", "message": "...", "category": "..." }
      ]
    }
    ```
  - Print summary to stderr: `✓ 5 tools ran, 2 skipped, 23 findings (3 high, 8 medium, 12 low)`
  - Exit 0 always (findings are informational, not blockers)

### 1.2 Dependency Scanners

| Tool | Ecosystem | Run |
|---|---|---|
| `pip-audit` | Python | `uvx pip-audit` |
| `npm audit` | Node.js | built-in |
| `yarn audit` | Node.js (Yarn) | built-in |
| `pnpm audit` | Node.js (pnpm) | built-in |
| `cargo audit` | Rust | `cargo install cargo-audit` / `nix run nixpkgs#cargo-audit` |
| `bundler-audit` | Ruby | `gem exec bundler-audit` / `nix run nixpkgs#bundler-audit` |
| `govulncheck` | Go | `go run golang.org/x/vuln/cmd/govulncheck@latest` |
| `trivy fs` | Multi-lang | `nix run nixpkgs#trivy -- fs .` / binary |
| `osv-scanner` | Multi-lang | `npx osv-scanner` / `nix run nixpkgs#osv-scanner` |

### 1.3 Secret Scanners

| Tool | What it catches | Run |
|---|---|---|
| `gitleaks` | Secrets in source + git history | `nix run nixpkgs#gitleaks` / binary |
| `trufflehog` | Secrets with verification | `uvx trufflehog` / `nix run nixpkgs#trufflehog` |
| `detect-secrets` | Secrets (baseline-aware) | `uvx detect-secrets scan` |

### 1.4 SAST / Pattern Matching

| Tool | Language | Run |
|---|---|---|
| `semgrep` | Multi-lang (custom rules possible) | `uvx semgrep` |
| `bandit` | Python | `uvx bandit` |
| `gosec` | Go | `go run github.com/securego/gosec/v2/cmd/gosec@latest` / `nix run nixpkgs#gosec` |
| `eslint-plugin-security` | JS/TS | `npx eslint --plugin security` (project-local) |
| `brakeman` | Ruby/Rails | `gem exec brakeman` / `nix run nixpkgs#brakeman` |
| `phpstan` / `psalm` | PHP | `npx phpstan` / `composer exec` |
| `SpotBugs` + `FindSecBugs` | Java | Maven/Gradle plugin |

### 1.5 IaC / Config Scanners

| Tool | What it scans | Run |
|---|---|---|
| `hadolint` | Dockerfiles | `nix run nixpkgs#hadolint` / binary |
| `trivy config` | Docker, K8s, Terraform, CloudFormation | `nix run nixpkgs#trivy -- config .` / binary |
| `checkov` | Terraform, K8s, Docker, ARM, CloudFormation | `uvx checkov` |
| `tfsec` | Terraform | `nix run nixpkgs#tfsec` / binary |
| `kube-linter` | Kubernetes YAML | `nix run nixpkgs#kube-linter` / binary |

### 1.6 Binary / IOC Analysis (threat-scan only)

| Tool | Purpose | Install |
|---|---|---|
| `file` | Identify file types | built-in (Linux/macOS) |
| `strings` | Extract readable strings from binaries | built-in |
| `sha256sum` | Hash for IOC matching | built-in |
| `objdump` | Disassemble suspicious binaries | binutils |

### 1.7 Integration into Workflows

- [ ] Update `security-audit.md` workflow:
  - Add pre-scan step between `compute_file_scope` and `spawn_scanner`
  - Pass `<tool_findings>` block to agent alongside `<files_to_read>`
  - Agent prompt shifts: "Analyze these tool findings in context, add business logic analysis,
    triage false positives, and produce the final report"
- [ ] Update `threat-scan.md` workflow:
  - Same pre-scan integration, but with threat-scan-specific tools (strings, sha256sum)
  - More conservative: tools must not execute target code (all tools listed above are static)

### 1.8 Update Agent Definitions

- [ ] `gsd-security-scanner.agent.md`:
  - Add `<tool_findings>` consumption step
  - Shift role from "scan everything" to "analyze structured findings + fill gaps"
  - "If tool findings are provided, use them as verified ground truth for mechanical checks.
    Focus your analysis on: business logic, cross-file taint tracking, attack chain reasoning,
    false positive triage, and remediation advice specific to this project."
- [ ] `gsd-threat-scanner.agent.md`:
  - Same shift
  - Special handling: if `strings` output contains suspicious URLs/IPs, agent does contextual
    analysis of whether they're legitimate or C2

---

## 2. Reference Files → Sub-Skills with Executable Examples

**Goal:** Transform the current passive reference markdown files into active sub-skills that include
runnable scan scripts/commands. Instead of the agent reading patterns and mentally matching them
against source code, the scripts do the matching and the agent reasons about results.

### 2.1 Sub-Skill Structure

Each language/framework/IaC reference file would evolve from:
```
## Code Vulnerabilities (OWASP)
- pattern description — explanation
```

To include executable scan helpers:
```
## Code Vulnerabilities (OWASP)
- pattern description — explanation

## Quick Scan Scripts

### Grep-Based Detection
 ```bash
# Command injection via eval
grep -rnE 'eval\s*\(' --include='*.py' .

# Hardcoded secrets
grep -rnE '(password|secret|api_key)\s*=\s*["\x27][^"\x27]{8,}' --include='*.py' .
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

### 2.2 Files to Evolve

**Languages (high-value first — most regex-scannable patterns):**
- [ ] `python.md` — bandit rules, grep patterns for eval/exec/pickle/yaml.load
- [ ] `javascript-typescript.md` — eslint-security rules, grep for eval/innerHTML/dangerouslySetInnerHTML
- [ ] `shell-bash.md` — grep for eval, curl|bash, /dev/tcp, base64 decode pipes
- [ ] `powershell.md` — grep for Invoke-Expression, -EncodedCommand, download cradles
- [ ] `go.md` — gosec rules, grep for sql.Query with string concat
- [ ] `java.md` — SpotBugs/FindSecBugs rules, grep for Runtime.exec, ProcessBuilder
- [ ] `c-cpp.md` — grep for gets/strcpy/sprintf/system, cppcheck rules
- [ ] `ruby.md` — brakeman rules, grep for system/exec/send
- [ ] `php.md` — grep for eval/system/exec/shell_exec/passthru, taint analysis patterns
- [ ] `rust.md` — grep for unsafe blocks, FFI calls, .unwrap() in error paths
- [ ] `csharp.md` — grep for Process.Start, SqlCommand with string concat
- [ ] `kotlin.md` — same as Java plus Kotlin-specific (string templates in SQL)
- [ ] `swift.md` — grep for NSTask, evaluateJavaScript
- [ ] `perl.md` — grep for eval, system, backticks, open with pipe
- [ ] `lua.md` — grep for loadstring, os.execute, io.popen
- [ ] `dart-flutter.md` — grep for Process.run, webview JS execution
- [ ] `html-css.md` — grep for onclick/onerror inline handlers, javascript: URIs

**IaC/Config (very high value — these are almost entirely regex-scannable):**
- [ ] `docker.md` — hadolint integration, grep for USER root, ADD vs COPY, --privileged
- [ ] `kubernetes.md` — kube-linter rules, grep for privileged/hostNetwork/hostPID
- [ ] `terraform.md` — tfsec/checkov rules, grep for hardcoded secrets in .tf
- [ ] `ansible.md` — grep for shell/command modules, no_log missing, vault patterns
- [ ] `cloud-init.md` — grep for runcmd with curl|bash, plaintext passwords

**Cross-cutting (partially scannable):**
- [ ] `databases-services.md` — grep for connection strings, default ports, raw queries
- [ ] `oauth-jwt.md` — grep for alg:none, JWT decode without verify, hardcoded signing keys
- [ ] `graphql.md` — grep for introspection enabled, no depth limit, no complexity limit
- [ ] `protocols.md` — grep for http:// (not https), verify=False, InsecureSkipVerify

**Frameworks (partially scannable, many require AST/semantic understanding):**
- [ ] Priority: `django.md`, `express.md`, `flask.md`, `spring.md`, `rails.md`, `laravel.md`
- [ ] Secondary: `react.md`, `nextjs.md`, `vue.md`, `angular.md`, `svelte.md`
- [ ] Python-specific: `fastapi.md`, `jinja.md`, `sqlalchemy.md`

### 2.3 Integration Model

The pre-scan script (from §1) would:
1. Detect languages present
2. For each detected language, run the corresponding sub-skill's grep/tool scripts
3. Collect structured results
4. Pass to agent as `<tool_findings>`

This means each sub-skill file becomes both:
- **Agent reference** (patterns + explanations for reasoning)
- **Script source** (executable commands for pre-scan)

---

## 3. Custom Semgrep Rule Library

**Goal:** Build a project-specific semgrep ruleset derived from our reference files.
Semgrep handles multi-line patterns, AST-aware matching, and taint tracking that grep can't.

- [ ] Create `.github/get-shit-done/semgrep/` directory
- [ ] Generate rules from reference file patterns:
  - `security-python.yml` — from python.md + django.md + flask.md + fastapi.md
  - `security-javascript.yml` — from javascript-typescript.md + react.md + express.md + nextjs.md
  - `security-go.yml` — from go.md
  - `security-java.yml` — from java.md + spring.md
  - `security-shell.yml` — from shell-bash.md (limited but useful for CI scripts)
  - `threat-patterns.yml` — from Threat Scan Patterns sections across all files
- [ ] Pre-scan script runs: `semgrep --config .github/get-shit-done/semgrep/ .`
- [ ] Results feed into `<tool_findings>`

---

## 4. Optimization: Token Budget Reduction

**Current pain:** Agent reads all reference files + all source files = massive context window.

**Improvements beyond pre-scan:**
- [ ] Only send source files that had tool findings (pre-filtered)
- [ ] For files with no findings, send just a summary line: "N files scanned, no findings"
- [ ] Cap reference file loading: if pre-scan covered a category exhaustively, skip that section
  of the reference file and only load the "business logic" / "design review" patterns
- [ ] Consider: reference files could have `## Automated` (skip if pre-scan ran) vs
  `## Manual Review` (always load) sections

---

## 5. Stretch Goals

- [ ] **CI Integration:** Generate GitHub Actions workflow that runs pre-scan on PRs
  - Runs deterministic tools only (no agent cost)
  - Flags findings as PR comments via `actions/github-script`
  - Agent-level analysis triggered manually or on critical findings
- [ ] **Baseline Mode:** `detect-secrets`-style baseline file so repeated scans only show new issues
- [ ] **SBOM Generation:** `syft` / `cyclonedx-cli` to generate Software Bill of Materials
- [ ] **License Compliance:** `scancode-toolkit` / `licensee` to check dependency licenses
- [ ] **Container Scanning:** `trivy image` for built container images
- [ ] **Runtime Analysis:** Dynamic analysis hooks (future — breaks static-only constraint)

---

## Priority Order

1. **Pre-scan script** (§1) — biggest bang for buck, immediately reduces agent token cost
2. **Shell/PowerShell/IaC grep scripts** (§2, IaC subset) — almost fully automatable
3. **Semgrep rules for top languages** (§3) — Python, JS/TS, Go, Java
4. **Workflow + agent integration** (§1.7, §1.8) — wire pre-scan into existing flow
5. **Sub-skill evolution for remaining languages** (§2.2) — incremental
6. **Token optimization** (§4) — polish after core pipeline works
7. **Stretch goals** (§5) — nice-to-have
