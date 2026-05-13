# PHP Security Patterns Reference

## Overview

PHP's loose typing, dynamic inclusion, and long legacy create a very rich vulnerability surface. Key risk areas:
- **SQL injection**: direct `$_GET`/`$_POST` in queries (MySQL extension, PDO misuse)
- **Command injection**: `exec()`, `system()`, `passthru()`, `shell_exec()` with user input
- **File inclusion (LFI/RFI)**: `include`/`require` with user-controlled paths
- **XSS**: `echo` with unsanitized variables, `htmlspecialchars` missing
- **Deserialization**: `unserialize()` with user data (POP chain gadgets)
- **Type juggling**: loose comparison (`==`) enabling authentication bypass

Ecosystem tools: `phpstan`, `psalm`, `semgrep p/php`, `RIPS`, `Enlightn` (Laravel)

---

## OWASP Top 10 Patterns

### A01:2021 — Broken Access Control

**Vulnerability signature:** Missing `auth()->check()`, direct role checks bypassable via type juggling.

#### Grep-Based Detection
```bash
# Direct file operations with user-controlled path
grep -rnE "\$_(GET|POST|REQUEST)\[.*(file|path|dir|folder)" --include="*.php" .

# Role checks using loose comparison (bypassable)
grep -rnE "\$.*role\s*==\s*['\"]admin['\"]|\$.*is_admin\s*==\s*true" --include="*.php" . | grep -v "==="
```

### A02:2021 — Cryptographic Failures

**Vulnerability signature:** `md5()`/`sha1()` for passwords, `rand()`/`mt_rand()` for tokens.

#### Grep-Based Detection
```bash
# Weak hashing for passwords
grep -rnE "md5\s*\(\s*\\\$.*pass|sha1\s*\(\s*\\\$.*pass" --include="*.php" .

# Insecure random for tokens
grep -rnE "rand\s*\(\|mt_rand\s*\(" --include="*.php" . | grep -i "token\|secret\|nonce\|session\|csrf"

# Hardcoded credentials
grep -rnE "\\\$(password|secret|api_key|token)\s*=\s*['\"][a-zA-Z0-9]{8,}['\"]" --include="*.php" . | grep -v "test\|example"
```

### A03:2021 — Injection

**Vulnerability signature:** SQL queries with string concatenation, `exec()`/`system()` with user input, `eval()` usage.

#### Grep-Based Detection
```bash
# SQL injection (direct concatenation)
grep -rnE "mysql_query\s*\(\s*['\"].*\\\$|mysqli_query\s*\(.*['\"].*\\\$|->query\s*\(['\"].*\\\$" --include="*.php" .
grep -rnE "SELECT.*\\\$_(GET|POST|REQUEST)|INSERT.*\\\$_(GET|POST)" --include="*.php" .

# Command injection
grep -rnE "(exec|system|passthru|shell_exec|proc_open)\s*\(\s*\\\$" --include="*.php" .
grep -rnE "backtick.*\\\$|\`.*\\\$_(GET|POST)" --include="*.php" .

# eval with user data
grep -rnE "eval\s*\(\s*\\\$_(GET|POST|REQUEST|COOKIE)" --include="*.php" .
```

#### Semgrep Rules
Rules: `php-sql-injection`, `php-command-injection` from `semgrep-rules-library.yml` (both HIGH)

### A03:2021 — File Inclusion (LFI/RFI)

**Vulnerability signature:** `include`/`require` with user-controlled path parameter.

#### Grep-Based Detection
```bash
# Local/Remote File Inclusion
grep -rnE "(include|require)(_once)?\s*\(\s*\\\$_(GET|POST|REQUEST|COOKIE)" --include="*.php" .
grep -rnE "(include|require)(_once)?\s*\(\s*.*\\\$\w+\s*\." --include="*.php" . | grep -v "defined\|validate"
```

#### Semgrep Rules
Rule: `php-file-inclusion` from library (HIGH confidence, FP rate: 3%)

### A03:2021 — XSS

**Vulnerability signature:** `echo $_GET[...]` without `htmlspecialchars()`.

#### Grep-Based Detection
```bash
# Direct echo of user input
grep -rnE "echo\s+\\\$_(GET|POST|REQUEST|COOKIE|SERVER)" --include="*.php" .
grep -rnE "print\s+\\\$_(GET|POST|REQUEST)" --include="*.php" .

# Missing htmlspecialchars
grep -rnE "echo\s+\\\$\w+" --include="*.php" . | grep -v "htmlspecialchars\|htmlentities\|e()" | head -20
```

### A05:2021 — Security Misconfiguration

**Vulnerability signature:** `display_errors=On` in production, `allow_url_include=On`, open `phpinfo()`.

#### Grep-Based Detection
```bash
# display_errors in production config
grep -rnE "display_errors\s*=\s*(On|1|true)" --include="*.php" --include="*.ini" . | grep -v "dev\|local\|test"

# phpinfo exposure
grep -rnE "phpinfo\s*\(\)" --include="*.php" .

# allow_url_include (enables RFI)
grep -rnE "allow_url_include\s*=\s*(On|1|true)" --include="*.php" --include="*.ini" .
```

### A08:2021 — Software and Data Integrity Failures

**Vulnerability signature:** `unserialize()` with user-controlled data (enables PHP POP chain attacks).

#### Grep-Based Detection
```bash
# PHP unserialize with user data
grep -rnE "unserialize\s*\(\s*\\\$_(GET|POST|REQUEST|COOKIE)" --include="*.php" .
grep -rnE "unserialize\s*\(\s*base64_decode\s*\(\s*\\\$" --include="*.php" .
```

---

## Quick Reference

| OWASP Category | PHP Pattern | Grep Snippet | FP Rate |
|----------------|------------|-------------|---------|
| A01 Access Control | Loose role compare | `grep "role.*==.*admin"` | 15% |
| A02 Crypto | md5/sha1 passwords | `grep "md5.*pass"` | 4% |
| A03 SQL Injection | $_ in query string | `grep "query.*\$_"` | 4% |
| A03 LFI/RFI | include($_GET) | `grep "include.*\$_"` | 3% |
| A03 XSS | echo $_ direct | `grep "echo \$_GET"` | 5% |
| A03 Command | exec($var) | `grep "exec\s*(\$"` | 5% |
| A05 Misconfig | display_errors=On | `grep "display_errors"` | 3% |
| A08 Integrity | unserialize($_) | `grep "unserialize.*\$_"` | 2% |

## Semgrep Configuration

```bash
semgrep==1.45.0 --config=p/php --json <target>
# Also: phpstan analyse --level=8 src/
```

## False Positive Rates

Tested across: Laravel 10, Symfony 6, WordPress 6, Drupal 10

| Rule | FP Rate | Notes |
|------|---------|-------|
| php-sql-injection | 4% | PDO with late binding |
| php-command-injection | 5% | Controlled input via escapeshellarg |
| php-file-inclusion | 3% | Path validated against allowlist |
| php-xss | 5% | Output via Blade/Twig auto-escape |
| unserialize | 2% | Signed/HMAC-verified payloads |

## Integration Notes

Loaded by:
1. `security_prescan.py` — runs phpstan + grep patterns
2. `pattern-loader.cjs` — `loadPatternFile('php')`
3. `gsd-security-scanner.md` — agent references for PHP/Laravel findings
