# JavaScript / TypeScript Security Patterns Reference

## Overview

JavaScript and TypeScript run in both browser and server (Node.js) environments, creating a dual attack surface. Key risk areas:
- **XSS surface**: `innerHTML`, `dangerouslySetInnerHTML`, `document.write`, template literals
- **Prototype pollution**: deep merge/extend with untrusted objects
- **Code injection**: `eval()`, `new Function()`, dynamic `require()`
- **Server-side**: Express middleware gaps, JWT misuse, path traversal in file operations
- **Async complexity**: race conditions, callback trust boundaries

Ecosystem tools: `eslint-plugin-security`, `semgrep p/javascript`, `npm audit`, `snyk`

---

## OWASP Top 10 Patterns

### A01:2021 — Broken Access Control

**Vulnerability signature:** Express routes without auth middleware, missing RBAC checks, IDOR via user-controlled parameters.

#### Grep-Based Detection
```bash
# Express routes potentially missing auth middleware
grep -rnE "app\.(get|post|put|delete|patch)\s*\(['\"]" --include="*.js" --include="*.ts" . | grep -v "login\|signup\|register\|health\|public"

# Direct use of user-provided IDs in queries
grep -rnE "req\.(params|query|body)\.(id|userId|account)" --include="*.js" --include="*.ts" . | grep -v "validate\|sanitize"

# IDOR: finding without ownership check pattern
grep -rnE "findById\s*\(\s*req\." --include="*.js" --include="*.ts" .
```

#### Semgrep Rules
Rule: `javascript-csrf-missing` from `semgrep-rules-library.yml`
```yaml
- id: javascript-missing-auth-middleware
  patterns:
    - pattern: $ROUTER.$METHOD($PATH, $HANDLER)
    - pattern-not: $ROUTER.$METHOD($PATH, $AUTH, $HANDLER)
  message: "Route handler may be missing authentication middleware"
  severity: WARNING
  languages: [javascript, typescript]
```

---

### A02:2021 — Cryptographic Failures

**Vulnerability signature:** Hardcoded JWT secrets, `Math.random()` for tokens, weak cipher selection.

#### Grep-Based Detection
```bash
# Hardcoded JWT secrets
grep -rnE "jwt\.(sign|verify)\s*\(.*['\"][a-zA-Z0-9]{8,}['\"]" --include="*.js" --include="*.ts" . | grep -v "process\.env\|config\."

# Math.random for security-sensitive values
grep -rnE "Math\.random\s*\(\)" --include="*.js" --include="*.ts" . | grep -i "token\|secret\|key\|session\|nonce"

# Insecure crypto
grep -rnE "createCipher\s*\(|createDecipher\s*\(" --include="*.js" --include="*.ts" .
```

#### Semgrep Rules
Rule: `javascript-jwt-hardcoded-secret` from library (HIGH confidence, FP rate: 3%)

---

### A03:2021 — Injection

**Vulnerability signature:** `eval()`, `innerHTML`, template literals in SQL/shell, NoSQL injection via `$where`.

#### Grep-Based Detection
```bash
# eval and new Function with user input
grep -rnE "eval\s*\(|new\s+Function\s*\(" --include="*.js" --include="*.ts" .

# XSS via innerHTML
grep -rnE "\.innerHTML\s*=|\.outerHTML\s*=" --include="*.js" --include="*.ts" . | grep -v "sanitize\|DOMPurify\|escape"

# SQL template literals without parameterization
grep -rnE "(query|execute|db\.run)\s*\(\s*\`[^`]*\$\{" --include="*.js" --include="*.ts" .

# Command injection in Node
grep -rnE "child_process\.(exec|spawn)\s*\(|require\('child_process'\)" --include="*.js" --include="*.ts" .

# NoSQL injection
grep -rnE "\\\$where\s*:|find\s*\(\s*req\." --include="*.js" --include="*.ts" .
```

#### Semgrep Rules
Rules: `javascript-eval-injection`, `javascript-dangeroushtml`, `javascript-nosql-injection` from library

---

### A04:2021 — Insecure Design

**Vulnerability signature:** Prototype pollution via `Object.assign()` or `_.merge()` with untrusted input.

#### Grep-Based Detection
```bash
# Prototype pollution vectors
grep -rnE "Object\.assign\s*\(\s*\{\}\s*,\s*req\.|_.merge\s*\(|deepMerge\s*\(" --include="*.js" --include="*.ts" .

# __proto__ or constructor access from user input
grep -rnE "req\.(body|query|params)\[.*__proto__|req\.(body|query)\[.*constructor" --include="*.js" --include="*.ts" .
```

#### Semgrep Rules
Rule: `javascript-prototype-pollution` from library (MEDIUM confidence, FP rate: 8%)

---

### A05:2021 — Security Misconfiguration

**Vulnerability signature:** CORS allowing all origins, missing security headers, debug endpoints exposed.

#### Grep-Based Detection
```bash
# Wildcard CORS
grep -rnE "cors\s*\(\s*\{.*origin\s*:\s*['\"]?\*" --include="*.js" --include="*.ts" .
grep -rnE "Access-Control-Allow-Origin.*\*" --include="*.js" --include="*.ts" .

# Missing Helmet (security headers)
grep -rn "express()" --include="*.js" --include="*.ts" . | xargs -I{} grep -L "helmet"

# Debug or error details exposed
grep -rnE "res\.json\s*\(\s*err\)|res\.send\s*\(\s*error" --include="*.js" --include="*.ts" .
```

---

### A07:2021 — Identification and Authentication Failures

**Vulnerability signature:** JWT `none` algorithm, session without secure flags, no brute force protection.

#### Grep-Based Detection
```bash
# JWT verification without algorithm check
grep -rnE "jwt\.verify\s*\(" --include="*.js" --include="*.ts" . | grep -v "algorithms\s*:\s*\["

# Cookie without secure/httpOnly
grep -rnE "res\.cookie\s*\(" --include="*.js" --include="*.ts" . | grep -v "httpOnly\s*:\s*true\|secure\s*:\s*true"

# Hardcoded JWT secret
grep -rnE "jwt\.(sign|verify)\s*\(\s*.*,\s*['\"][^'\"]{4,}['\"]" --include="*.js" --include="*.ts" .
```

---

### A08:2021 — Software and Data Integrity Failures

**Vulnerability signature:** `serialize-javascript` misuse, missing SRI for CDN scripts, `eval` of remote responses.

#### Grep-Based Detection
```bash
# Scripts without SRI hash
grep -rnE "<script\s+src=" --include="*.html" --include="*.ejs" . | grep -v "integrity="

# Deserializing user data
grep -rnE "JSON\.parse\s*\(\s*req\.(body|query|params)" --include="*.js" --include="*.ts" . | grep -v "try"
```

---

### A10:2021 — Server-Side Request Forgery (SSRF)

**Vulnerability signature:** `fetch()`, `axios`, `http.get()` with user-supplied URL.

#### Grep-Based Detection
```bash
# SSRF via fetch/axios with user-controlled URL
grep -rnE "(fetch|axios\.(get|post))\s*\(\s*(req\.|url\s*=|params\." --include="*.js" --include="*.ts" .

# http.get with dynamic URL
grep -rnE "http\.(get|request)\s*\(\s*req\." --include="*.js" --include="*.ts" .
```

---

## Quick Reference by Pattern

| OWASP Category | JS/TS Pattern | Grep Snippet | Severity |
|----------------|--------------|-------------|---------|
| A01 Access Control | Missing auth middleware | `grep "app.get.*req"` | HIGH |
| A02 Crypto | Hardcoded JWT secret | `grep "jwt.sign.*['\"]"` | CRITICAL |
| A03 Injection | innerHTML / eval | `grep "innerHTML ="` | CRITICAL |
| A04 Design | Prototype pollution | `grep "Object.assign.*req"` | HIGH |
| A05 Misconfiguration | Wildcard CORS | `grep "origin.*\*"` | HIGH |
| A07 Auth | JWT no-alg verify | `grep "jwt.verify"` | HIGH |
| A10 SSRF | fetch with user URL | `grep "fetch.*req\."` | HIGH |

## Semgrep Configuration

Run all JS/TS patterns:
```bash
semgrep==1.45.0 --config=p/security-audit --lang=javascript --lang=typescript --json <target>
```

React-specific:
```bash
semgrep==1.45.0 --config=p/react --json <target>
```

## False Positive Rates

Tested across: express-validator, passport, next.js, nestjs, fastify

| Rule | FP Rate | Notes |
|------|---------|-------|
| javascript-dangeroushtml | 2% | Sanitized via DOMPurify |
| javascript-eval-injection | 5% | Template engines, config loading |
| javascript-prototype-pollution | 8% | Controlled merge in reducers |
| javascript-nosql-injection | 6% | Validated mongoose schemas |
| javascript-csrf-missing | 10% | APIs with JWT (stateless) |
| javascript-jwt-hardcoded-secret | 3% | Test environments |

## Integration Notes

Loaded by:
1. `security_prescan.py` — grep patterns executed against target
2. `pattern-loader.cjs` — `loadPatternFile('javascript')` or `loadPatternFile('typescript')`
3. `gsd-security-scanner.md` — agent references for contextualizing eslint-security findings

## Threat Scan Patterns

> These patterns detect *deliberately malicious code* — not developer mistakes, but intentional
> attacks embedded in a codebase. Source: SEED-008 `get-shit-done/semgrep/threat-patterns.yml`.

### Obfuscation Fingerprints

**What to look for:** Base64 decode chains feeding eval/Function, charCode arrays hiding string
literals, computed property access hiding calls to `eval`/`require`.

#### Grep-Based Detection
```bash
# Base64-decode-then-eval chains
grep -rn "eval(.*atob\|eval(.*Buffer\.from.*base64\|eval(.*b64decode" .

# CharCode array obfuscation
grep -rn "String\.fromCharCode" . | grep -v "test\|spec\|__tests__"

# Computed property call hiding (obj['ev'+'al'])
grep -rn "\[.*['\"].*+.*['\"].*\](" . --include="*.js" --include="*.ts"
```

#### Semgrep Rules (from threat-patterns.yml)
- `thr-obfuscation-base64-eval-js` — eval(atob(...)) or eval(Buffer.from(...,'base64').toString())
- `thr-obfuscation-charcode-array-js` — String.fromCharCode with 5+ integer arguments
- `thr-obfuscation-computed-property-call-js` — obj[$str + $str2](...) computed calls

### Backdoors and Reverse Shells

**What to look for:** child_process.spawn with /bin/sh or /bin/bash, hidden Express routes at
debug/admin paths, WebSocket connections to raw IP addresses.

#### Grep-Based Detection
```bash
# Reverse shell via child_process
grep -rn "spawn.*bin/[ba]*sh\|exec.*bin/sh" . --include="*.js" --include="*.ts"

# Hidden admin/debug routes
grep -rn "\.get\|\.post\|\.all" . --include="*.js" | grep -E "debug|backdoor|__exec|shell"

# Raw IP WebSocket (potential C2)
grep -rn "new WebSocket.*ws[s]*://[0-9]" . --include="*.js" --include="*.ts"
```

#### Semgrep Rules
- `thr-backdoor-reverse-shell-js` — child_process.spawn('/bin/sh', ...) variants
- `thr-backdoor-hidden-route-js` — routes matching debug/backdoor/shell path patterns
- `thr-exfil-websocket-tunnel-js` — WebSocket to hardcoded IP

### Supply Chain Hooks

**What to look for:** Network calls in postinstall/preinstall lifecycle scripts, file writes
to paths outside `__dirname`, environment variable enumeration at install time.

#### Grep-Based Detection
```bash
# Outbound HTTP in any file named install*.js or postinstall*
find . -name "postinstall*" -o -name "preinstall*" -o -name "install.js" | xargs grep -ln "fetch\|http\.request\|https\.get" 2>/dev/null

# Full env enumeration (data harvesting)
grep -rn "Object\.entries(process\.env)\|Object\.keys(process\.env)\|JSON\.stringify(process\.env)" .
```

#### Semgrep Rules
- `thr-supply-chain-npm-hook-network-js` — fetch/http.request in install hooks
- `thr-supply-chain-npm-hook-file-write-js` — fs.writeFileSync to non-__dirname path
- `thr-osint-env-enumeration-js` — Object.entries/keys(process.env)
- `thr-osint-credential-file-access-js` — readFile(.aws/credentials, .ssh/id_*)

### Logic Bombs

**What to look for:** Date.now()/new Date() comparisons with hardcoded epoch timestamps
controlling destructive operations; counter modulo conditions gating network calls.

#### Grep-Based Detection
```bash
# Hardcoded epoch timestamp comparisons
grep -rn "Date\.now()\s*>\|new Date()\.getTime()\s*>" . --include="*.js" --include="*.ts"

# Modulo counter gates
grep -rn "% [0-9]\+ === 0\b" . --include="*.js" | grep -v "test\|spec"
```

#### Semgrep Rules
- `thr-logic-bomb-date-gate-js` — Date.now() > EPOCH controlling eval/exec/fs.unlinkSync
- `thr-logic-bomb-counter-gate-js` — counter % prime === 0 gating destructive call

## Threat Scan Patterns

> These patterns detect *deliberately malicious code* — not developer mistakes, but intentional
> attacks embedded in a codebase. Source: SEED-008 `get-shit-done/semgrep/threat-patterns.yml`.

### Obfuscation Fingerprints

**What to look for:** Base64 decode chains feeding eval/Function, charCode arrays hiding string
literals, computed property access hiding calls to `eval`/`require`.

#### Grep-Based Detection
```bash
# Base64-decode-then-eval chains
grep -rn "eval(.*atob\|eval(.*Buffer\.from.*base64\|eval(.*b64decode" .

# CharCode array obfuscation
grep -rn "String\.fromCharCode" . | grep -v "test\|spec\|__tests__"

# Computed property call hiding (obj['ev'+'al'])
grep -rn "\[.*['\"].*+.*['\"].*\](" . --include="*.js" --include="*.ts"
```

#### Semgrep Rules (from threat-patterns.yml)
- `thr-obfuscation-base64-eval-js` — eval(atob(...)) or eval(Buffer.from(...,'base64').toString())
- `thr-obfuscation-charcode-array-js` — String.fromCharCode with 5+ integer arguments
- `thr-obfuscation-computed-property-call-js` — obj[$str + $str2](...) computed calls

### Backdoors and Reverse Shells

**What to look for:** child_process.spawn with /bin/sh or /bin/bash, hidden Express routes at
debug/admin paths, WebSocket connections to raw IP addresses.

#### Grep-Based Detection
```bash
# Reverse shell via child_process
grep -rn "spawn.*bin/[ba]*sh\|exec.*bin/sh" . --include="*.js" --include="*.ts"

# Hidden admin/debug routes
grep -rn "\.get\|\.post\|\.all" . --include="*.js" | grep -E "debug|backdoor|__exec|shell"

# Raw IP WebSocket (potential C2)
grep -rn "new WebSocket.*ws[s]*://[0-9]" . --include="*.js" --include="*.ts"
```

#### Semgrep Rules
- `thr-backdoor-reverse-shell-js` — child_process.spawn('/bin/sh', ...) variants
- `thr-backdoor-hidden-route-js` — routes matching debug/backdoor/shell path patterns
- `thr-exfil-websocket-tunnel-js` — WebSocket to hardcoded IP

### Supply Chain Hooks

**What to look for:** Network calls in postinstall/preinstall lifecycle scripts, file writes
to paths outside `__dirname`, environment variable enumeration at install time.

#### Grep-Based Detection
```bash
# Outbound HTTP in any file named install*.js or postinstall*
find . -name "postinstall*" -o -name "preinstall*" -o -name "install.js" | xargs grep -ln "fetch\|http\.request\|https\.get" 2>/dev/null

# Full env enumeration (data harvesting)
grep -rn "Object\.entries(process\.env)\|Object\.keys(process\.env)\|JSON\.stringify(process\.env)" .
```

#### Semgrep Rules
- `thr-supply-chain-npm-hook-network-js` — fetch/http.request in install hooks
- `thr-supply-chain-npm-hook-file-write-js` — fs.writeFileSync to non-__dirname path
- `thr-osint-env-enumeration-js` — Object.entries/keys(process.env)
- `thr-osint-credential-file-access-js` — readFile(.aws/credentials, .ssh/id_*)

### Logic Bombs

**What to look for:** Date.now()/new Date() comparisons with hardcoded epoch timestamps
controlling destructive operations; counter modulo conditions gating network calls.

#### Grep-Based Detection
```bash
# Hardcoded epoch timestamp comparisons
grep -rn "Date\.now()\s*>\|new Date()\.getTime()\s*>" . --include="*.js" --include="*.ts"

# Modulo counter gates
grep -rn "% [0-9]\+ === 0\b" . --include="*.js" | grep -v "test\|spec"
```

#### Semgrep Rules
- `thr-logic-bomb-date-gate-js` — Date.now() > EPOCH controlling eval/exec/fs.unlinkSync
- `thr-logic-bomb-counter-gate-js` — counter % prime === 0 gating destructive call
