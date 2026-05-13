# Java Security Patterns Reference

## Overview

Java's platform ecosystem (Spring, Hibernate, JEE) introduces rich security surface areas. Key risk areas:
- **Injection**: JDBC string concatenation, JPQL injection, XXE in XML parsers
- **Deserialization**: `ObjectInputStream` with untrusted data (class gadget chains)
- **Reflection**: Dynamic class loading, expression language injection (SpEL)
- **Authentication**: Spring Security misconfiguration, JWT algorithm confusion
- **XXE**: `DocumentBuilderFactory`, `SAXParser`, `XMLInputFactory` without entity restriction
- **JNDI injection**: Log4Shell class (CVE-2021-44228) and similar lookup patterns

Ecosystem tools: `SpotBugs + find-sec-bugs`, `semgrep p/java`, `OWASP Dependency Check`, `Snyk`

---

## OWASP Top 10 Patterns

### A01:2021 — Broken Access Control

**Vulnerability signature:** Missing `@PreAuthorize`, insecure direct object reference, missing Spring Security method security.

#### Grep-Based Detection
```bash
# Spring MVC endpoints without security annotations
grep -rnE "@(GetMapping|PostMapping|RequestMapping)" --include="*.java" . | grep -v "@PreAuthorize\|@Secured\|@RolesAllowed"

# Direct use of user ID in repository calls
grep -rnE "repository\.(find|get)ById\s*\(\s*(request|param|id)" --include="*.java" .
```

### A02:2021 — Cryptographic Failures

**Vulnerability signature:** MD5/SHA1 for passwords, `DES`/`RC4` ciphers, hardcoded secrets.

#### Grep-Based Detection
```bash
# Weak message digests
grep -rnE "MessageDigest\.getInstance\s*\(['\"]?(MD5|SHA-1|SHA1)" --include="*.java" .

# Weak cipher algorithms
grep -rnE "Cipher\.getInstance\s*\(['\"]?(DES|RC4|AES/ECB)" --include="*.java" .

# Hardcoded credentials
grep -rnE "(password|secret|apiKey)\s*=\s*['\"][a-zA-Z0-9]{8,}['\"]" --include="*.java" . | grep -v "test\|example"
```

### A03:2021 — Injection

**Vulnerability signature:** `Statement.executeQuery()` with string concatenation, SpEL injection, LDAP injection.

#### Grep-Based Detection
```bash
# SQL injection via Statement (not PreparedStatement)
grep -rnE "Statement.*executeQuery\s*\(|createStatement\s*\(\)" --include="*.java" .
grep -rnE "executeQuery\s*\(\s*\".*\+\s*\w\|executeUpdate\s*\(\s*\".*\+" --include="*.java" .

# JPQL injection
grep -rnE "createQuery\s*\(['\"].*\+\s*\w|createNativeQuery\s*\(['\"].*\+" --include="*.java" .

# Expression language injection (SpEL)
grep -rnE "ExpressionParser.*parseExpression\s*\(\s*\w|SpelExpressionParser" --include="*.java" .
```

#### Semgrep Rules
Rule: `java-sql-injection` from `semgrep-rules-library.yml` (HIGH confidence, FP rate: 3%)

### A05:2021 — Security Misconfiguration

**Vulnerability signature:** XXE in XML parsers, JNDI lookup injection, verbose error responses.

#### Grep-Based Detection
```bash
# XXE: DocumentBuilder without entity protection
grep -rnE "DocumentBuilderFactory\.newInstance\s*\(\)" --include="*.java" . | xargs -I{} grep -L "setFeature.*DISALLOW_DOCTYPE\|setExpandEntityReferences.*false"

# JNDI lookup with user input (Log4Shell-style)
grep -rnE "InitialContext\s*\(\)\.lookup\s*\(|NamingManager\.getInitialContext" --include="*.java" .

# Verbose error responses
grep -rnE "e\.printStackTrace\s*\(\)|e\.getMessage\s*\(\).*response" --include="*.java" .
```

#### Semgrep Rules
Rule: `java-xxe` from library (HIGH confidence, FP rate: 4%)

### A07:2021 — Identification and Authentication Failures

**Vulnerability signature:** Spring Security `permitAll()` on sensitive endpoints, JWT without algorithm pinning.

#### Grep-Based Detection
```bash
# Spring Security permitAll on non-public paths
grep -rnE "\.permitAll\s*\(\)" --include="*.java" . | grep -v "login\|public\|static\|actuator/health"

# JWT without algorithm verification
grep -rnE "Jwts\.parser\s*\(\)" --include="*.java" . | grep -v "setAllowedAlgorithms\|requireAlgorithm"
```

### A08:2021 — Software and Data Integrity Failures

**Vulnerability signature:** `ObjectInputStream.readObject()` with untrusted data, insecure Java serialization.

#### Grep-Based Detection
```bash
# Java native deserialization
grep -rnE "new\s+ObjectInputStream\s*\(|readObject\s*\(\)" --include="*.java" .

# XStream deserialization
grep -rnE "new\s+XStream\s*\(\)|xstream\.fromXML\s*\(" --include="*.java" .
```

#### Semgrep Rules
Rule: `java-deserialization` from library (HIGH confidence, FP rate: 2%)

---

## Quick Reference

| OWASP Category | Java Pattern | Grep Snippet | FP Rate |
|----------------|-------------|-------------|---------|
| A01 Access Control | Missing @PreAuthorize | `grep "@GetMapping"` | 15% |
| A02 Crypto | MD5/SHA1 digest | `grep "MD5\|SHA-1"` | 5% |
| A03 Injection | Statement + concatenation | `grep "executeQuery.*+"` | 3% |
| A05 Misconfiguration | XXE DocumentBuilder | `grep "DocumentBuilderFactory"` | 4% |
| A07 Auth | Spring permitAll | `grep "permitAll"` | 10% |
| A08 Integrity | ObjectInputStream | `grep "readObject()"` | 2% |

## Semgrep Configuration

```bash
semgrep==1.45.0 --config=p/java --json <target>
# Also: spotbugs -textui -plugin findsecbugs-plugin.jar
```

## False Positive Rates

Tested across: Spring Boot, Hibernate, Struts2, Apache CXF, Jackson

| Rule | FP Rate | Notes |
|------|---------|-------|
| java-sql-injection | 3% | ORM wrappers exposing raw query |
| java-xxe | 4% | Trusted internal XML sources |
| java-deserialization | 2% | Internal serialization with class allow-list |
| java-deserialization (XStream) | 8% | Restricted type converters |

## Integration Notes

Loaded by:
1. `security_prescan.py` — runs SpotBugs + grep patterns
2. `pattern-loader.cjs` — `loadPatternFile('java')`
3. `gsd-security-scanner.md` — agent references for Java/Spring findings
