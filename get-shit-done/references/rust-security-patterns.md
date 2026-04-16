# Rust Security Patterns Reference

## Overview

Rust's ownership system and borrow checker eliminate memory safety vulnerabilities at compile time. The remaining security surface is focused on:
- **`unsafe` blocks**: bypasses Rust's memory guarantees, must be audited carefully
- **SQL injection**: `sqlx`/`diesel` raw query macros with string formatting
- **Integer overflow**: arithmetic on untrusted values (default panics in debug, wraps in release)
- **Deserialization**: `serde` with unvalidated user data, type confusion attacks
- **Supply chain**: `Cargo.lock` drift, yanked crate versions
- **Logic vulnerabilities**: TOCTOU, race conditions in async code (tokio)

Ecosystem tools: `cargo-audit`, `cargo-deny`, `semgrep p/rust`, `clippy`

**Note:** Rust's memory safety eliminates CWE-120 (buffer overflow), CWE-416 (use-after-free), CWE-476 (null dereference). Focus on logic, unsafe, and integration boundaries.

---

## OWASP Top 10 Patterns

### A01:2021 — Broken Access Control

**Vulnerability signature:** Missing authorization checks in Axum/Actix handlers, IDOR via path params.

#### Grep-Based Detection
```bash
# Handler functions without auth extractors
grep -rnE "async fn\s+\w+\s*\(" --include="*.rs" . | grep -v "Auth\|Claims\|Session\|middleware"

# Path params used directly in queries
grep -rnE "Path\s*\(\s*\w+\s*\).*query\|extract.*path" --include="*.rs" . | grep -v "validate"
```

### A02:2021 — Cryptographic Failures

**Vulnerability signature:** `rand::thread_rng()` for security tokens, MD5/SHA1 via `md5` crate.

#### Grep-Based Detection
```bash
# thread_rng used for security-sensitive values
grep -rnE "thread_rng\(\)|rand::random\(\)" --include="*.rs" . | grep -i "token\|secret\|key\|nonce\|session"

# Weak hash crates
grep -rn "extern crate md5\|use md5::\|extern crate sha1\|use sha1::" --include="*.rs" .

# Hardcoded secrets
grep -rnE "(password|secret|api_key|token)\s*:\s*['\"][a-zA-Z0-9]{8,}['\"]" --include="*.rs" . | grep -v "test\|example"
```

### A03:2021 — Injection

**Vulnerability signature:** `format!()` macro in SQL queries, `std::process::Command` with user input.

#### Grep-Based Detection
```bash
# SQL injection via format! macro
grep -rnE "sqlx::query\s*\(\s*&format!\|diesel::sql_query\s*\(\s*&format!" --include="*.rs" .
grep -rnE "format!\s*\(.*SELECT|format!\s*\(.*INSERT|format!\s*\(.*WHERE" --include="*.rs" .

# Command injection
grep -rnE "Command::new\s*\(\s*&\w+\)|\.arg\s*\(\s*&\w+" --include="*.rs" . | grep -v "Command::new\s*\(['\"]"
```

#### Semgrep Rules
Rule: `rust-sql-injection` from `semgrep-rules-library.yml` (MEDIUM confidence)

### A04:2021 — Insecure Design / Unsafe Blocks

**Vulnerability signature:** `unsafe` blocks performing pointer arithmetic, raw pointer dereference.

#### Grep-Based Detection
```bash
# Any unsafe block (requires manual review)
grep -rnE "unsafe\s*\{|unsafe\s+fn\s+" --include="*.rs" .

# Raw pointer dereference
grep -rnE "\*\s*(mut\s+)?\w+\s*as\s*\*|from_raw\s*\(" --include="*.rs" .

# Transmute (type reinterpretation)
grep -rnE "std::mem::transmute\s*\(|mem::transmute" --include="*.rs" .
```

#### Semgrep Rules
Rule: `rust-unsafe-block` from library (LOW confidence, FP rate: 20% — unsafe may be intentional)

### A06:2021 — Vulnerable and Outdated Components

**Vulnerability signature:** Dependencies with published advisories in `Cargo.lock`.

#### Detection
```bash
# Run cargo-audit for known advisories
cargo audit 2>&1 | grep -E "vulnerability|warning|error"

# Check for yanked versions
cargo deny check advisories 2>&1
```

### A08:2021 — Software and Data Integrity Failures

**Vulnerability signature:** `serde` deserialization of arbitrary user JSON without schema validation.

#### Grep-Based Detection
```bash
# Deserialization directly from request body without validation
grep -rnE "serde_json::from_str\s*\(|serde_json::from_slice\s*\(" --include="*.rs" . | grep -v "validate\|schema"

# Bincode/RON deserialization of untrusted data
grep -rnE "bincode::deserialize\s*\(|ron::from_str\s*\(" --include="*.rs" .
```

---

## Quick Reference

| OWASP Category | Rust Pattern | Grep Snippet | FP Rate |
|----------------|-------------|-------------|---------|
| A01 Access Control | Missing auth extractor | `grep "async fn.*handler"` | 20% |
| A02 Crypto | thread_rng for secrets | `grep "thread_rng"` | 10% |
| A03 Injection | format! in SQL | `grep "format!.*SELECT"` | 8% |
| A04 Design | unsafe block | `grep "unsafe {"` | 20% |
| A06 Components | cargo audit | `cargo audit` | N/A |
| A08 Integrity | serde deserialize | `grep "from_str.*body"` | 12% |

## Semgrep Configuration

```bash
semgrep==1.45.0 --config=p/rust --json <target>
# Also: cargo clippy -- -W clippy::all
```

## False Positive Rates

Tested across: actix-web, axum, tokio, sqlx, serde

| Rule | FP Rate | Notes |
|------|---------|-------|
| rust-unsafe-block | 20% | FFI bindings, performance-critical code |
| rust-sql-injection | 8% | Dynamic but validated queries |
| Cargo audit | 5% | Dev-only dependency vulnerabilities |

## Integration Notes

Loaded by:
1. `security_prescan.py` — runs `cargo audit` + grep patterns
2. `pattern-loader.cjs` — `loadPatternFile('rust')`
3. `gsd-security-scanner.md` — agent references for Rust-specific findings
