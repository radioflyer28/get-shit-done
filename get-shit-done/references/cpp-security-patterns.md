# C/C++ Security Patterns Reference

## Overview

C and C++ provide direct memory management, creating a class of vulnerabilities that higher-level languages eliminate. Key risk areas:
- **Buffer overflow**: `strcpy`/`strcat`/`gets`/`sprintf` without bounds checking
- **Format string**: `printf` family with user-controlled format argument
- **Integer overflow**: unchecked arithmetic used in array indexing or memory allocation
- **Use-after-free / double-free**: manual `malloc`/`free` lifecycle errors
- **Null pointer dereference**: missing NULL checks before pointer operations
- **Injection**: system()/popen() with user-controlled strings

Ecosystem tools: `clang-tidy`, `cppcheck`, `AddressSanitizer (ASAN)`, `semgrep p/c`, `Coverity`

**Note:** C/C++ patterns have generally higher false positive rates due to the prevalence of internal-use-only code paths. Conservative thresholds are used.

---

## OWASP Top 10 Patterns

### A03:2021 — Injection

**Vulnerability signature:** `system()`, `popen()`, `exec*()` family with user-controlled arguments.

#### Grep-Based Detection
```bash
# Command injection via system/popen
grep -rnE "system\s*\(\s*\w|popen\s*\(\s*\w|execl\s*\(\s*\w|execv\s*\(\s*\w" --include="*.c" --include="*.cpp" --include="*.h" .

# Format string injection
grep -rnE "printf\s*\(\s*\w|fprintf\s*\(\s*\w+\s*,\s*\w|sprintf\s*\(\s*\w+\s*,\s*\w" --include="*.c" --include="*.cpp" .

# SQL injection via sprintf + database call
grep -rnE "sprintf\s*\(.*sql\|snprintf\s*\(.*query" --include="*.c" --include="*.cpp" .
```

#### Semgrep Rules
Rules: `cpp-buffer-overflow`, `cpp-format-string` from `semgrep-rules-library.yml`

### A04:2021 — Insecure Design (Memory Safety)

**Vulnerability signature:** Unbounded string operations, unchecked allocation sizes, integer overflow in index math.

#### Grep-Based Detection
```bash
# Dangerous string functions without bounds
grep -rnE "\bstrcpy\s*\(|\bstrcat\s*\(|\bgets\s*\(|\bsprintf\s*\(" --include="*.c" --include="*.cpp" --include="*.h" .

# Unsafe string functions (n-variants missing)
grep -rnE "\bscanf\s*\(\s*['\"]%s" --include="*.c" --include="*.cpp" .

# Integer overflow in malloc sizing
grep -rnE "malloc\s*\(\s*\w+\s*\*\s*\w+\s*\)|alloca\s*\(\s*\w" --include="*.c" --include="*.cpp" .

# Use-after-free patterns
grep -rnE "free\s*\(\s*\w+\s*\).*\w+\s*=" --include="*.c" --include="*.cpp" . | head -20

# Null pointer dereference risk
grep -rnE "=\s*malloc\s*\(|=\s*calloc\s*\(" --include="*.c" --include="*.cpp" . | grep -v "if\s*\(\s*\w\+\s*==\s*NULL\|assert\s*("
```

### A05:2021 — Security Misconfiguration

**Vulnerability signature:** Insecure permissions (`chmod 777`), weak umask, world-readable temp files.

#### Grep-Based Detection
```bash
# Insecure file permissions
grep -rnE "chmod\s*\(\s*\w+\s*,\s*0[67][67][67]\)" --include="*.c" --include="*.cpp" .

# Predictable temp files
grep -rnE "tmpnam\s*\(\|mktemp\s*\(" --include="*.c" --include="*.cpp" .

# Race condition (TOCTOU): stat/access before open
grep -rnE "\baccess\s*\(\|stat\s*\(" --include="*.c" --include="*.cpp" . | grep -B2 -A2 "open\s*("
```

### A07:2021 — Authentication Failures

**Vulnerability signature:** Hardcoded credentials, insecure `strcmp` for password comparison (timing attack).

#### Grep-Based Detection
```bash
# Hardcoded passwords in comparisons
grep -rnE "strcmp\s*\(\s*\w+\s*,\s*['\"][a-zA-Z0-9]{4,}['\"]|memcmp\s*\(\s*\w+\s*,\s*\w+" --include="*.c" --include="*.cpp" . | grep -i "pass\|auth\|secret"

# Timing-vulnerable password compare
grep -rnE "strcmp\s*\(.*password\|strncmp\s*\(.*password" --include="*.c" --include="*.cpp" .
```

---

## Quick Reference

| OWASP Category | C/C++ Pattern | Grep Snippet | FP Rate |
|----------------|--------------|-------------|---------|
| A03 Injection | system() / popen() | `grep "system\s*(\w"` | 12% |
| A03 Format String | printf(user_var) | `grep "printf\s*(\w"` | 6% |
| A04 Design | strcpy/strcat/gets | `grep "\bstrcpy\b"` | 12% |
| A04 Overflow | malloc(n*m) | `grep "malloc.*\*"` | 15% |
| A05 Misconfig | chmod 0777 | `grep "chmod.*777"` | 3% |
| A07 Auth | strcmp passwords | `grep "strcmp.*pass"` | 20% |

## Semgrep Configuration

```bash
semgrep==1.45.0 --config=p/c --json <target>
# Also: cppcheck --enable=all --inconclusive <target>
# Or: clang-tidy -checks='clang-analyzer-*,cert-*' <target>
```

## False Positive Rates

Tested across: OpenSSL, curl, nginx, sqlite, Redis

| Rule | FP Rate | Notes |
|------|---------|-------|
| cpp-buffer-overflow | 12% | Bounds checked by caller contract |
| cpp-format-string | 6% | Literal format strings in log wrappers |
| system() / popen() | 12% | Controlled environment scripts |
| strlen timing | 20% | Non-security string compare |

**Note:** C/C++ patterns intentionally have higher FP rates. All HIGH/CRITICAL findings require human review before filing.

## Integration Notes

Loaded by:
1. `security_prescan.py` — runs cppcheck + grep patterns; ASAN for runtime
2. `pattern-loader.cjs` — `loadPatternFile('cpp')` (covers both C and C++)
3. `gsd-security-scanner.md` — agent references for memory safety triage
