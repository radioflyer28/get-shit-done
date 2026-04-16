# Python Security Patterns Reference

## Overview

Python's dynamic nature and rich ecosystem create a broad security surface. Key risk areas:
- **Runtime code evaluation**: `eval()`, `exec()`, `compile()` with user input
- **Serialization attacks**: `pickle`, `yaml.load`, `shelve` with untrusted data
- **Web frameworks**: Django, Flask, FastAPI — each with framework-specific pitfalls
- **System interaction**: `subprocess`, `os.system` enabling command injection
- **Cryptography**: hashlib misuse, hardcoded secrets, weak RNG

Ecosystem tools: `bandit` (static analysis), `safety` (dep scanning), `semgrep p/python`

---

## OWASP Top 10 Patterns

### A01:2021 — Broken Access Control

**Vulnerability signature:** Missing authentication decorator, hardcoded role checks, IDOR via user-controlled IDs.

#### Grep-Based Detection
```bash
# Missing @login_required decorator before view functions
grep -rn "^def \|^async def " --include="*.py" . | grep -v "login_required\|permission_required\|@"

# Direct user ID from request without ownership check
grep -rnE "request\.(GET|POST|data)\[.*(id|user_id|account_id)" --include="*.py" .

# Hardcoded admin role comparisons
grep -rnE "role\s*==\s*['\"]admin['\"]|is_admin\s*==\s*True" --include="*.py" .
```

#### Semgrep Rules
Rule: `python-auth-bypass` (OWASP A01) — see `semgrep-rules-library.yml`
```yaml
- id: python-missing-login-required
  pattern: |
    @app.route(...)
    def $FUNC(...):
      ...
  pattern-not: |
    @login_required
    @app.route(...)
    def $FUNC(...):
      ...
  message: "Flask route missing @login_required"
  severity: WARNING
  languages: [python]
```

---

### A02:2021 — Cryptographic Failures

**Vulnerability signature:** MD5/SHA1 for passwords, hardcoded secrets in source, `random` module for security tokens.

#### Grep-Based Detection
```bash
# Weak hash algorithms for passwords
grep -rnE "hashlib\.(md5|sha1)\s*\(|MD5\s*\(|SHA1\s*\(" --include="*.py" .

# Hardcoded secrets or passwords
grep -rnE "(password|secret|api_key|token)\s*=\s*['\"][^'\"]{8,}['\"]" --include="*.py" . | grep -v "test\|example\|placeholder"

# Insecure random for security purposes
grep -rnE "random\.(random|randint|choice)\s*\(" --include="*.py" . | grep -i "token\|secret\|key\|nonce\|session"
```

#### Semgrep Rules
Rule: `python-weak-crypto` from `semgrep-rules-library.yml` (confidence: MEDIUM, FP rate: 10%)

---

### A03:2021 — Injection

**Vulnerability signature:** SQL f-strings, `eval()`/`exec()` with user data, `subprocess` with `shell=True`, `os.system()`.

#### Grep-Based Detection
```bash
# SQL injection via f-strings or format
grep -rnE "(execute|query)\s*\(\s*(f['\"]|['\"].*%s|['\"].*\.format)" --include="*.py" .

# eval/exec with variables (not literals)
grep -rnE "eval\s*\((?!['\"])|exec\s*\((?!['\"])" --include="*.py" .

# Command injection via subprocess
grep -rnE "subprocess\.(run|call|Popen)\s*\(.*shell\s*=\s*True" --include="*.py" .
grep -rnE "os\.system\s*\(|os\.popen\s*\(" --include="*.py" .
```

#### Semgrep Rules
Rules: `python-eval-injection`, `python-sql-injection`, `python-command-injection` from library (all HIGH confidence)

---

### A05:2021 — Security Misconfiguration

**Vulnerability signature:** `DEBUG=True` in production, default secret keys, verbose exception exposure.

#### Grep-Based Detection
```bash
# Django DEBUG=True
grep -rn "DEBUG\s*=\s*True" --include="*.py" --include="*.cfg" . | grep -v "test\|spec"

# Default Django secret key
grep -rnE "SECRET_KEY\s*=\s*['\"]django-insecure" --include="*.py" .

# Flask debug mode
grep -rnE "app\.run\s*\(.*debug\s*=\s*True" --include="*.py" .
```

---

### A07:2021 — Identification and Authentication Failures

**Vulnerability signature:** Weak password hashing (not bcrypt/argon2), missing MFA, insecure session configuration.

#### Grep-Based Detection
```bash
# Using hashlib directly for passwords (should use bcrypt/argon2)
grep -rnE "hashlib\.(sha256|sha512)\s*\(.*password" --include="*.py" .

# Missing session security flags
grep -rnE "SESSION_COOKIE_SECURE\s*=\s*False|SESSION_COOKIE_HTTPONLY\s*=\s*False" --include="*.py" .
```

---

### A08:2021 — Software and Data Integrity Failures

**Vulnerability signature:** `pickle.loads()` with user data, `yaml.load()` without SafeLoader.

#### Grep-Based Detection
```bash
# Pickle deserialization (high risk)
grep -rnE "pickle\.load\s*\(|pickle\.loads\s*\(" --include="*.py" .

# YAML unsafe loader
grep -rnE "yaml\.load\s*\((?!.*SafeLoader|.*BaseLoader)" --include="*.py" .
```

#### Semgrep Rules
Rules: `python-pickle-deserialization`, `python-yaml-load` from library (both HIGH confidence)

---

### A10:2021 — Server-Side Request Forgery (SSRF)

**Vulnerability signature:** `requests.get()` or `urllib` with user-supplied URL without allowlist.

#### Grep-Based Detection
```bash
# HTTP requests to user-controlled URLs
grep -rnE "requests\.(get|post|put|head)\s*\(\s*(request\.|f['\"]|url)" --include="*.py" .
grep -rnE "urllib\.request\.urlopen\s*\(" --include="*.py" . | grep -v "http[s]\?://[a-zA-Z]"
```

#### Semgrep Rules
Rule: `python-ssrf` from library (confidence: MEDIUM, FP rate: 12%)

---

## Quick Reference by Pattern

| OWASP Category | Python Pattern | Grep Snippet | Severity |
|----------------|---------------|-------------|---------|
| A01 Access Control | Missing `@login_required` | `grep "^def.*view"` | HIGH |
| A02 Crypto | MD5/SHA1 passwords | `grep "hashlib.md5"` | HIGH |
| A03 Injection | SQL f-strings / eval | `grep "execute.*f'"` | CRITICAL |
| A05 Misconfiguration | DEBUG=True | `grep "DEBUG.*True"` | HIGH |
| A07 Auth Failures | hashlib for passwords | `grep "hashlib.*password"` | HIGH |
| A08 Integrity | pickle.loads / yaml.load | `grep "pickle.load"` | CRITICAL |
| A10 SSRF | requests with user URL | `grep "requests.get.*request"` | HIGH |

## Semgrep Configuration

Run all Python patterns:
```bash
# Pinned version (from semgrep-rules-library.yml)
semgrep==1.45.0 --config=p/security-audit --lang=python --json <target>
```

## False Positive Rates

Tested across: django-allauth, flask-restx, fastapi, sqlalchemy, celery

| Rule | FP Rate | Notes |
|------|---------|-------|
| python-eval-injection | 5% | Config loading, not user input |
| python-sql-injection | 3% | ORM methods wrapping raw SQL |
| python-command-injection | 7% | Controlled subprocess in scripts |
| python-pickle-deserialization | 2% | Internal serialization |
| python-yaml-load | 4% | Internal config files |
| python-weak-crypto | 10% | Checksums (not passwords) |
| python-ssrf | 12% | Internal service calls |

## Integration Notes

Loaded by:
1. `security_prescan.py` — grep patterns executed against target codebase
2. `pattern-loader.cjs` — `loadPatternFile('python')` returns structured patterns
3. `gsd-security-scanner.md` — agent references for contextualizing bandit findings
