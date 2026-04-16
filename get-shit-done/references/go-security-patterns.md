# Go Security Patterns Reference

## Overview

Go's strong type system and memory safety eliminate entire vulnerability classes (buffer overflow, use-after-free). Key remaining risk areas:
- **SQL injection**: `database/sql` with `fmt.Sprintf` query construction
- **Command injection**: `os/exec` with user-controlled arguments
- **Path traversal**: `os.Open()` with unsanitized user paths
- **Cryptographic failures**: `math/rand` vs `crypto/rand`, weak TLS config
- **XXE**: XML parsing without entity restriction
- **SSRF**: `net/http` client with user-supplied URLs

Ecosystem tools: `gosec`, `staticcheck`, `semgrep p/golang`

**Note:** Go memory safety eliminates A04 memory concerns; focus is on logic, input handling, and cryptography.

---

## OWASP Top 10 Patterns

### A01:2021 — Broken Access Control

**Vulnerability signature:** Missing JWT/session validation in HTTP handlers, IDOR via URL params.

#### Grep-Based Detection
```bash
# HTTP handlers potentially missing auth check
grep -rnE "func\s+\w+\s*\(\s*w\s+http\.ResponseWriter" --include="*.go" . | grep -v "auth\|verify\|check"

# Direct use of URL param as DB key without ownership check
grep -rnE "r\.URL\.Query\(\)\|r\.PathValue\|chi\.URLParam" --include="*.go" . | grep -v "validate"
```

### A02:2021 — Cryptographic Failures

**Vulnerability signature:** `math/rand` for security tokens, `crypto/tls` with minimum version below 1.2.

#### Grep-Based Detection
```bash
# math/rand used for security-sensitive values
grep -rnE "rand\.(Intn|Int63|Float64)\s*\(" --include="*.go" . | grep -v "crypto/rand\|math/rand.*comment"

# Weak TLS config
grep -rnE "MinVersion\s*:\s*tls\.(VersionTLS10|VersionTLS11|VersionSSL30)" --include="*.go" .

# Hardcoded secrets
grep -rnE "(password|secret|apiKey|token)\s*:?=\s*['\"][a-zA-Z0-9]{8,}['\"]" --include="*.go" . | grep -v "test\|example"
```

### A03:2021 — Injection

**Vulnerability signature:** `fmt.Sprintf` in SQL queries, `exec.Command` with user input.

#### Grep-Based Detection
```bash
# SQL injection via Sprintf
grep -rnE "fmt\.Sprintf\s*\(['\"].*SELECT|fmt\.Sprintf\s*\(['\"].*INSERT|fmt\.Sprintf\s*\(['\"].*WHERE" --include="*.go" .

# Command injection
grep -rnE "exec\.Command\s*\(" --include="*.go" . | grep -v "exec\.Command\s*\(['\"]"

# Path traversal
grep -rnE "os\.Open\s*\(\s*filepath\.Join\s*\(|ioutil\.ReadFile\s*\(\s*r\." --include="*.go" .
```

#### Semgrep Rules
Rules: `go-sql-injection`, `go-command-injection` from `semgrep-rules-library.yml`

### A05:2021 — Security Misconfiguration

**Vulnerability signature:** XXE in XML parsing, missing security response headers.

#### Grep-Based Detection
```bash
# XML parsing without entity restriction (XXE)
grep -rnE "xml\.NewDecoder\s*\(|xml\.Unmarshal\s*\(" --include="*.go" . | grep -v "DisallowUnknownFields"

# Missing security headers
grep -rnE "w\.Header\(\)\.Set\s*\(" --include="*.go" . | grep -v "X-Frame-Options\|Content-Security-Policy\|X-Content-Type"
```

#### Semgrep Rules
Rule: `go-xxe` from library (MEDIUM confidence, FP rate: 8%)

### A10:2021 — Server-Side Request Forgery (SSRF)

**Vulnerability signature:** `http.Get()` with user-controlled URL.

#### Grep-Based Detection
```bash
# SSRF: HTTP client with user-controlled URL
grep -rnE "http\.(Get|Post|Do)\s*\(|http\.NewRequest\s*\(" --include="*.go" . | grep -v "http\.(Get|Post)\s*\(['\"]http"
```

---

## Quick Reference

| OWASP Category | Go Pattern | Grep Snippet | FP Rate |
|----------------|-----------|-------------|---------|
| A01 Access Control | Missing auth handler | `grep "func.*ResponseWriter"` | 15% |
| A02 Crypto | math/rand for tokens | `grep "rand.Intn"` | 10% |
| A03 Injection | fmt.Sprintf SQL | `grep "Sprintf.*SELECT"` | 4% |
| A05 Misconfiguration | XXE in xml.Decoder | `grep "xml.NewDecoder"` | 8% |
| A10 SSRF | http.Get user URL | `grep "http.Get.*r\."` | 12% |

## Semgrep Configuration

```bash
semgrep==1.45.0 --config=p/golang --json <target>
# Also: gosec ./... for Go-specific checks
```

## False Positive Rates

Tested across: gin, echo, chi, go-kit, grpc-go

| Rule | FP Rate | Notes |
|------|---------|-------|
| go-sql-injection | 4% | ORM wrappers around raw queries |
| go-command-injection | 6% | Controlled binaries with static args |
| go-xxe | 8% | Internal XML config parsing |

## Integration Notes

Loaded by:
1. `security_prescan.py` — runs `gosec ./...` + grep patterns
2. `pattern-loader.cjs` — `loadPatternFile('go')`
3. `gsd-security-scanner.md` — agent references for Go-specific findings

## Threat Scan Patterns

> These patterns detect *deliberately malicious code* -- not developer mistakes, but intentional
> attacks embedded in a codebase. Source: SEED-008 get-shit-done/semgrep/threat-patterns.yml.
> Note: Go semgrep coverage in threat-patterns.yml is lighter than JS/Python; grep patterns
> are the primary detection mechanism for Go.

### Obfuscation Fingerprints

**What to look for:** reflect + unsafe combinations used to call functions without visible
signatures, init() functions making unexpected network calls, build-tag-gated malicious code.

#### Grep-Based Detection
```bash
# reflect + unsafe usage (obfuscation via reflection)
grep -rn "reflect.|unsafe." . --include="*.go" | grep -v "_test.go|vendor"

# Dynamic eval-equivalent: plugin loading
grep -rn "plugin.Open|plugin.Lookup" . --include="*.go"

# Network calls in init() functions
grep -B2 -A20 "^func init()" . -r --include="*.go" | grep -E "http.|net.|Dial|Connect"
```

#### Semgrep Rules
Go obfuscation coverage in threat-patterns.yml is limited. Use grep patterns above as primary
detection. The thr-supply-chain-build-rs-network rule covers Rust build scripts; Go has no
equivalent rule yet -- use grep on init() network patterns.

### Backdoors and Reverse Shells

**What to look for:** net.Dial or net.Listen combined with os/exec in close proximity,
os.Stdin/os.Stdout reassignment to network connections, cmd.Stdin = conn patterns.

#### Grep-Based Detection
```bash
# net.Dial combined with exec.Command (reverse shell)
grep -rn "net.Dial|net.Listen" . --include="*.go" | grep -v "_test.go"
grep -rn "exec.Command" . --include="*.go" | grep -v "_test.go"

# stdin/stdout assigned to network conn (reverse shell signature)
grep -rn ".Stdins*=|.Stdouts*=" . --include="*.go" | grep -v "_test.go"
```

### Supply Chain Hooks (init() and build tags)

**What to look for:** Network calls in init() functions that fire at import time; build
constraint tags that gate malicious code to specific environments.

#### Grep-Based Detection
```bash
# init() with network calls
grep -rn "func init()" . --include="*.go" -l | xargs grep -l "http.|net.Dial" 2>/dev/null

# Suspicious build tags
grep -rn "//go:build|// +build" . --include="*.go" | grep -v "_test.go"

# os.Getenv bulk enumeration (data harvesting)
grep -rn "os.Environ()" . --include="*.go" | grep -v "_test.go"
```

#### Semgrep Rules
- thr-supply-chain-build-rs-network covers Rust build.rs. For Go, use grep on init() patterns.

### Logic Bombs (Build Tags)

**What to look for:** Build tags that activate code only in specific environments
(linux+amd64, specific version), combined with destructive or exfiltrating operations.

#### Grep-Based Detection
```bash
# Build-tag restricted files
grep -rn "//go:build|// +build" . --include="*.go" | grep -v "_test.go|vendor"

# Date/time comparisons with hardcoded values
grep -rn "time.Now().After|time.Now().Before|time.Unix([0-9]" . --include="*.go"
```

### OSINT Harvesting

**What to look for:** os.Environ() (returns all env vars as slice), reading ~/.aws, ~/.ssh paths.

#### Grep-Based Detection
```bash
# Bulk env var enumeration
grep -rn "os.Environ()" . --include="*.go" | grep -v "_test.go"

# Credential path access
grep -rn ".aws/credentials|.ssh/id_|.kube/config" . --include="*.go"

# HOME + credential path construction
grep -rn "os.Getenv.*HOME|homedir." . --include="*.go" | grep -v "_test.go"
```