# OWASP Top 10 Foundation Reference

## Metadata

| Field | Value |
|-------|-------|
| Edition | OWASP Top 10 2021 |
| Last reviewed | 2026-04-16 |
| Next review | 2027-01-01 |
| Sources | owasp.org, cwe.mitre.org, semgrep.dev |

## OWASP Top 10 Reference

### A01:2021 — Broken Access Control

**Description:** Access control enforces policy such that users cannot act outside their intended permissions. Failures result in unauthorized information disclosure, modification, or destruction of all data, or performing a business function outside the user's limits.

**Attack vectors:** Direct object reference manipulation, privilege escalation via URL manipulation, JWT token tampering, missing function-level access control, CORS misconfiguration permitting unauthorized API access.

**Business risk:** Data breach, unauthorized modification of user data, administrative account takeover, regulatory compliance violations (GDPR, HIPAA, PCI-DSS).

**CWE mappings:** CWE-284 (Improper Access Control), CWE-285 (Improper Authorization), CWE-639 (IDOR), CWE-862 (Missing Authorization), CWE-863 (Incorrect Authorization)

**Generic pattern signatures:**
- `[MISSING_AUTH_CHECK]` — route handler without authentication middleware
- `[IDOR_DIRECT_REF]` — user-controlled ID used directly in database query without ownership check
- `[PRIVILEGE_ESCALATION]` — role/permission modification without admin check

---

### A02:2021 — Cryptographic Failures

**Description:** Failures related to cryptography (or lack thereof) that often lead to exposure of sensitive data. Includes use of weak algorithms, improper key management, missing TLS, and in-transit/at-rest data exposure.

**Attack vectors:** MITM attacks on unencrypted channels, brute force against weak hashes (MD5/SHA1), key extraction from source code or environment files, downgrade attacks on TLS 1.0/1.1.

**Business risk:** Credential theft, PII exposure, intellectual property theft, regulatory fines, loss of customer trust.

**CWE mappings:** CWE-259 (Hardcoded Password), CWE-327 (Broken or Risky Crypto Algorithm), CWE-328 (Reversible One-Way Hash), CWE-330 (Insufficient Random Values), CWE-331 (Insufficient Entropy)

**Generic pattern signatures:**
- `[WEAK_HASH]` — MD5 or SHA1 used for password hashing
- `[HARDCODED_SECRET]` — API key, password, or token in source code
- `[WEAK_RANDOM]` — Math.random() or rand() used for security-sensitive values
- `[MISSING_TLS]` — HTTP endpoint for sensitive data transmission

---

### A03:2021 — Injection

**Description:** An application is vulnerable to injection attacks when user-supplied data is not validated, filtered, or sanitized. An attacker can use injection to manipulate query structure, OS commands, LDAP queries, or code interpreters.

**Attack vectors:** SQL injection via unsanitized query parameters, command injection via shell execution with user input, LDAP injection, XPath injection, Server-Side Template Injection (SSTI), NoSQL injection, code injection via eval/exec.

**Business risk:** Full database compromise, remote code execution, authentication bypass, data exfiltration, server takeover.

**CWE mappings:** CWE-20 (Improper Input Validation), CWE-77 (Command Injection), CWE-78 (OS Command Injection), CWE-79 (XSS), CWE-89 (SQL Injection), CWE-94 (Code Injection)

**Generic pattern signatures:**
- `[SQL_CONCAT]` — SQL query built by string concatenation with user input
- `[EVAL_USER_INPUT]` — eval/exec with unsanitized user input
- `[SHELL_INJECT]` — OS command execution with user-controlled arguments
- `[TEMPLATE_INJECT]` — template rendering with unsanitized user data

---

### A04:2021 — Insecure Design

**Description:** Missing or ineffective control design as opposed to implementation defects. Insecure design is present when a threat model was never created or business logic exploits were not considered.

**Attack vectors:** Business logic flaws, missing rate limiting enabling brute force, price manipulation in e-commerce, bypassing workflow steps, unrestricted resource allocation.

**Business risk:** Fraud, account takeover at scale, bypass of critical business safeguards, data integrity violations.

**CWE mappings:** CWE-73 (File Name or Path Controlled by External Party), CWE-209 (Information Exposure Through Error Message), CWE-256 (Unprotected Storage of Credentials), CWE-501 (Trust Boundary Violation)

**Generic pattern signatures:**
- `[MISSING_RATE_LIMIT]` — login or sensitive endpoint without rate limiting
- `[VERBOSE_ERROR]` — error messages exposing stack traces or internal details
- `[TRUST_BOUNDARY]` — data crossing trust boundary without re-validation

---

### A05:2021 — Security Misconfiguration

**Description:** Security misconfiguration is the most commonly seen vulnerability. Often manifests as default credentials, incomplete configuration, open cloud storage, unnecessary features enabled, or verbose error messages.

**Attack vectors:** Default admin credentials, open S3 buckets, exposed debug endpoints, directory listing enabled, unnecessary HTTP methods (TRACE/DELETE), missing security headers.

**Business risk:** Full application compromise, data exposure, server takeover, lateral movement in infrastructure.

**CWE mappings:** CWE-2 (7PK - Environment), CWE-16 (Configuration), CWE-388 (Error Handling), CWE-732 (Incorrect Permission Assignment), CWE-1021 (Improper Restriction of Rendered UI Layers)

**Generic pattern signatures:**
- `[DEBUG_ENABLED]` — DEBUG=True or debug mode in production config
- `[DEFAULT_CREDS]` — default username/password in configuration
- `[MISSING_SECURITY_HEADER]` — missing Content-Security-Policy, X-Frame-Options, HSTS
- `[EXPOSED_ADMIN]` — admin/management endpoint accessible without IP restriction

---

### A06:2021 — Vulnerable and Outdated Components

**Description:** Using components with known vulnerabilities or outdated/unmaintained versions. Includes libraries, frameworks, OS, and runtime components without timely patching.

**Attack vectors:** Exploiting published CVEs in dependencies, supply chain attacks via compromised packages, typosquatting in package registries.

**Business risk:** Remote code execution via known exploits, data breach through unpatched vulnerabilities, compliance violations.

**CWE mappings:** CWE-1035 (OWASP Top Ten 2017 Category - Using Components with Known Vulnerabilities), CWE-1104 (Use of Unmaintained Third Party Components)

**Generic pattern signatures:**
- `[KNOWN_VULN_DEP]` — dependency with published CVE (detected by dep scanners)
- `[OUTDATED_DEP]` — dependency significantly behind current major version
- `[EOL_RUNTIME]` — language runtime or framework past end-of-life

---

### A07:2021 — Identification and Authentication Failures

**Description:** Confirmation of the user's identity, authentication, and session management is critical to protect against authentication-related attacks. Vulnerabilities include credential stuffing enablement, brute force, weak passwords, insecure session tokens.

**Attack vectors:** Credential stuffing with leaked credential databases, brute force on login without lockout, session fixation, JWT algorithm confusion (none algorithm), insecure remember-me tokens.

**Business risk:** Account takeover, impersonation, identity theft, unauthorized access to privileged functions.

**CWE mappings:** CWE-287 (Improper Authentication), CWE-295 (Improper Certificate Validation), CWE-297 (Improper Validation of Certificate Expiration), CWE-384 (Session Fixation), CWE-798 (Hardcoded Credentials)

**Generic pattern signatures:**
- `[JWT_NONE_ALG]` — JWT verification allowing "none" algorithm
- `[WEAK_SESSION]` — session token with insufficient entropy
- `[NO_LOCKOUT]` — login without brute force protection
- `[HARDCODED_CREDS]` — hardcoded username/password in authentication code

---

### A08:2021 — Software and Data Integrity Failures

**Description:** Code and infrastructure failures related to unverified software updates, deserialization of untrusted data, and missing integrity checks in CI/CD pipelines.

**Attack vectors:** Insecure deserialization of user-controlled objects, auto-update without signature verification, compromised CDN resources without SRI, unsigned software packages.

**Business risk:** Remote code execution via deserialization gadgets, supply chain attacks, data tampering, critical infrastructure compromise.

**CWE mappings:** CWE-345 (Insufficient Verification of Data Authenticity), CWE-349 (Acceptance of Extraneous Untrusted Data With Trusted Data), CWE-502 (Deserialization of Untrusted Data), CWE-565 (Reliance on Cookies Without Validation)

**Generic pattern signatures:**
- `[UNSAFE_DESER]` — deserialization of user-controlled data without type restriction
- `[MISSING_SRI]` — external script/style without Subresource Integrity hash
- `[UNSAFE_PICKLE]` — Python pickle.loads() with user data
- `[JAVA_DESERIALIZE]` — Java ObjectInputStream on untrusted data

---

### A09:2021 — Security Logging and Monitoring Failures

**Description:** Without logging and monitoring, breaches cannot be detected. Insufficient logging enables attackers to pivot, maintain persistence, and exfiltrate data undetected.

**Attack vectors:** Exploiting applications that log nothing or log in untrusted sinks, log injection, log4shell-style attacks, silently swallowed exceptions.

**Business risk:** Attacker persistence undetected, inability to conduct forensic investigation, regulatory non-compliance (audit trail requirements), extended breach exposure window.

**CWE mappings:** CWE-117 (Improper Output Neutralization for Logs), CWE-223 (Omission of Security-Relevant Information), CWE-532 (Information Exposure Through Log Files), CWE-778 (Insufficient Logging)

**Generic pattern signatures:**
- `[EMPTY_CATCH]` — exception caught and silently ignored without logging
- `[MISSING_AUDIT_LOG]` — sensitive operations (login, permission change) without audit logging
- `[LOG_INJECTION]` — user-controlled data in log messages without sanitization

---

### A10:2021 — Server-Side Request Forgery (SSRF)

**Description:** SSRF flaws occur when a web application fetches a remote resource without validating the user-supplied URL. Enables attackers to force the server to make requests to internal services, metadata APIs, or arbitrary external systems.

**Attack vectors:** Cloud metadata endpoint access (169.254.169.254), internal service enumeration, reading local files via file:// scheme, bypassing network controls via DNS rebinding, SSRF via webhooks or PDF generators.

**Business risk:** Cloud credential theft (AWS metadata), internal service compromise, data exfiltration, lateral movement, RCE via internal service exploitation.

**CWE mappings:** CWE-918 (Server-Side Request Forgery)

**Generic pattern signatures:**
- `[UNVALIDATED_URL_FETCH]` — HTTP client making request to user-supplied URL without allowlist
- `[METADATA_EXPOSURE]` — server making request to internal/metadata IPs
- `[FILE_SCHEME_FETCH]` — request accepting file:// or ftp:// schemes

---

## Quick Reference Index

| OWASP Category | CWE Parent | Semgrep Rule Prefix | Risk Level |
|----------------|-----------|---------------------|-----------|
| A01:2021 Broken Access Control | CWE-284 | `*-auth-bypass`, `*-idor` | Critical |
| A02:2021 Cryptographic Failures | CWE-327 | `*-weak-crypto`, `*-hardcoded-secret` | High |
| A03:2021 Injection | CWE-89, CWE-78, CWE-94 | `*-sqli`, `*-cmdi`, `*-eval` | Critical |
| A04:2021 Insecure Design | CWE-209 | `*-rate-limit`, `*-trust-boundary` | Medium |
| A05:2021 Security Misconfiguration | CWE-16 | `*-debug-enabled`, `*-default-creds` | High |
| A06:2021 Vulnerable Components | CWE-1104 | dep-scan (tool-based) | High |
| A07:2021 Auth Failures | CWE-287 | `*-jwt-none`, `*-weak-session` | Critical |
| A08:2021 Integrity Failures | CWE-502 | `*-unsafe-deser`, `*-unsafe-pickle` | Critical |
| A09:2021 Logging Failures | CWE-778 | `*-missing-log`, `*-empty-catch` | Medium |
| A10:2021 SSRF | CWE-918 | `*-ssrf`, `*-unvalidated-url` | High |

## Integration Notes

This file is referenced by:
1. `agents/gsd-security-scanner.md` — agent loads this as foundational context
2. `get-shit-done/bin/lib/pattern-loader.cjs` — runtime parser for structured pattern access
3. Language-specific pattern files — each references these category IDs for consistency

Language-specific files extend each category with idiomatic patterns:
- `python-security-patterns.md`
- `javascript-typescript-security-patterns.md`
- `go-security-patterns.md`
- `rust-security-patterns.md`
- `java-security-patterns.md`
- `cpp-security-patterns.md`
- `php-security-patterns.md`
