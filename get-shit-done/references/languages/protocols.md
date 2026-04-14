# Protocol Security Reference

This reference covers protocol-level security analysis for both security audits and threat scans.
When a project uses any of these protocols, evaluate whether the protocol choice is appropriate
for the project's security requirements and whether the implementation is secure.

## Transport Layer Security (TLS/SSL)

**Version Vulnerabilities:**
| Protocol | Status | Vulnerability |
|----------|--------|---------------|
| SSL 2.0 | **BANNED** | DROWN, no integrity, trivially broken |
| SSL 3.0 | **BANNED** | POODLE, CBC oracle attacks |
| TLS 1.0 | **Deprecated** | BEAST, Lucky13, no AEAD support |
| TLS 1.1 | **Deprecated** | No AEAD support, weak cipher suites |
| TLS 1.2 | **Acceptable** | Secure when configured with AEAD ciphers (AES-GCM, ChaCha20-Poly1305) |
| TLS 1.3 | **Recommended** | Removes legacy ciphers, 0-RTT option, forward secrecy mandatory |

**Configuration Checks:**
- Minimum version should be TLS 1.2 (TLS 1.3 preferred)
- Cipher suite ordering: server preference, AEAD-only (AES-256-GCM, ChaCha20-Poly1305)
- Forward secrecy: ECDHE key exchange required
- Certificate pinning for mobile apps and high-security APIs
- HSTS header with `max-age >= 31536000`, `includeSubDomains`, and `preload`
- OCSP stapling enabled for certificate revocation checking
- Certificate chain completeness (intermediate certs included)

**Code Patterns to Flag:**
```
# Disabling certificate verification
verify=False                                    # Python requests
InsecureSkipVerify: true                        # Go TLS config
rejectUnauthorized: false                       # Node.js
SSL_VERIFY_NONE                                 # OpenSSL
ServerCertificateValidationCallback.*=> true    # .NET
badCertificateCallback.*=> true                 # Dart

# Hardcoded TLS version downgrades
SSLv23_METHOD|SSLv3_METHOD|TLSv1_METHOD        # Python OpenSSL
MinVersion.*tls.VersionTLS10                    # Go
secureProtocol.*TLSv1_method                    # Node.js
SecurityProtocolType.Tls$|Tls11                 # .NET (Tls = 1.0)

# Weak cipher suites
RC4|DES|3DES|EXPORT|NULL|anon                  # Any config
```

## HTTP / HTTPS

**Version Considerations:**
| Protocol | Status | Notes |
|----------|--------|-------|
| HTTP/1.0 | **Avoid** | No host header requirement, no persistent connections, no chunked encoding |
| HTTP/1.1 | **Acceptable** | Request smuggling surface (ambiguous Content-Length/Transfer-Encoding) |
| HTTP/2 | **Recommended** | Binary framing, header compression (HPACK — but see CRIME for compression-based attacks) |
| HTTP/3 | **Emerging** | QUIC-based, built-in encryption, connection migration (new attack surface for session tracking) |

**Security Checks:**
- All authenticated endpoints must use HTTPS (never HTTP)
- HTTP to HTTPS redirect must be present (but not relied upon — use HSTS)
- HTTP/1.1 request smuggling: check for `Transfer-Encoding: chunked` + `Content-Length` ambiguity
- HTTP/2: rapid reset attack mitigation (CVE-2023-44487) — check server limits on concurrent streams
- CORS configuration: no `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true`
- Cookie flags: `Secure`, `HttpOnly`, `SameSite=Strict|Lax`
- Missing security headers: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy

**Plaintext HTTP Red Flags:**
- API calls to `http://` endpoints (data in transit is readable)
- Webhook receivers accepting `http://` callbacks
- Internal service communication over `http://` (lateral movement risk)
- `http://` URLs in OAuth redirect URIs
- Mixed content: HTTPS page loading HTTP resources

## FTP / SFTP / SCP / FTPS

**Protocol Choice:**
| Protocol | Status | Notes |
|----------|--------|-------|
| FTP | **BANNED** | Plaintext credentials, plaintext data, active mode firewall issues |
| FTPS | **Acceptable** | FTP + TLS — complex, implicit vs explicit mode confusion |
| SFTP | **Recommended** | SSH-based, single port, strong auth, encrypted |
| SCP | **Deprecated** | Legacy, replaced by SFTP; protocol-level vulnerabilities (CVE-2019-6111) |

**Code Patterns to Flag:**
```
# Plaintext FTP
ftp://                                         # FTP URLs in code
ftplib.FTP(                                    # Python FTP (not FTP_TLS)
net.Dial("tcp", .*:21)                        # Go FTP
new Ftp(                                       # Various languages
# Alert: FTP transmits credentials in plaintext. Use SFTP instead.

# FTP with credentials
FTP.*user|FTP.*pass|anonymous@                 # Embedded FTP credentials
```

## DNS

**Protocol Versions:**
| Protocol | Status | Notes |
|----------|--------|-------|
| DNS (UDP/53) | **Standard** | Unencrypted, spoofable, cache poisoning risk |
| DNS over TLS (DoT) | **Good** | Encrypted DNS, port 853, prevents eavesdropping |
| DNS over HTTPS (DoH) | **Good** | Encrypted DNS via HTTPS, port 443, prevents eavesdropping |
| DNSSEC | **Recommended** | Authentication (not confidentiality), prevents spoofing/poisoning |

**Security Checks:**
- DNS queries for sensitive hostnames over plaintext — privacy leak
- DNS rebinding: server-side code resolving user-provided hostnames then connecting (SSRF via DNS rebinding)
- DNS tunneling: check for unusual TXT record queries or abnormally long subdomains
- DNS cache poisoning: applications caching DNS results without TTL respect
- Customer-controlled DNS (CNAME delegation) — subdomain takeover if service is decommissioned

**Threat Scan Patterns:**
- Code constructing long subdomain labels (`data.encoded.as.labels.evil.com`) — DNS exfiltration
- Domain Generation Algorithms (DGA): computed domain names in network calls
- DNS resolver libraries with hardcoded resolvers (bypassing system DNS)

## WebSocket (WS / WSS)

**Security Checks:**
- `ws://` (unencrypted) — must be `wss://` (TLS) for production
- Missing origin validation on WebSocket upgrade handshake — CSWSH (Cross-Site WebSocket Hijacking)
- No authentication on WebSocket connection (token must be validated at connection time, not just in HTTP headers)
- Missing message rate limiting — DoS via message flooding
- Unsanitized message content used in DOM — WebSocket-based XSS
- Reconnection logic without re-authentication — session resurrection attacks
- Large message handling without size limits — memory exhaustion

## gRPC / Protocol Buffers

**Security Checks:**
- `grpc.insecure_channel()` / `grpc.WithInsecure()` — plaintext gRPC
- Missing mTLS between services — no mutual authentication
- Protobuf field presence: unknown fields silently ignored (may bypass validation)
- Reflection service enabled in production (`grpc.reflection`) — service enumeration
- No deadline/timeout on RPC calls — hanging connections
- Large message size without `MaxRecvMsgSize` / `MaxSendMsgSize` limits

## SMTP / Email

**Protocol Versions:**
| Feature | Status | Notes |
|---------|--------|-------|
| SMTP plaintext (port 25) | **Relay only** | No encryption, header injection risk |
| SMTP + STARTTLS | **Acceptable** | Opportunistic encryption — MITM can strip upgrade |
| SMTPS (port 465) | **Recommended** | Implicit TLS, mandatory encryption |
| SPF/DKIM/DMARC | **Required** | Anti-spoofing, anti-phishing |

**Code Patterns to Flag:**
```
# Plaintext email
smtplib.SMTP\(.*25\)                          # Python SMTP port 25
smtp://                                        # SMTP URLs
# Missing STARTTLS
smtp.ehlo.*smtp.login                         # Login without STARTTLS
# Email header injection
To:.*\n|Subject:.*\r\n                        # Newlines in email headers from user input
```

## SSH

**Security Checks:**
- SSH protocol version 1 — **banned** (weak key exchange, known attacks)
- Weak key types: DSA (1024-bit fixed), RSA < 2048 bits
- Password authentication enabled when key-based auth is available
- `StrictHostKeyChecking=no` or `UserKnownHostsFile=/dev/null` — MITM risk
- Agent forwarding (`-A` / `ForwardAgent yes`) — stolen agent access on compromised host
- `PermitRootLogin yes` — direct root access
- SSH keys without passphrases deployed to servers
- `authorized_keys` with `command=""` restrictions that are too permissive

**Code Patterns:**
```
# Paramiko / Fabric / SSH libraries
set_missing_host_key_policy(AutoAddPolicy)     # Python — auto-trust new hosts
StrictHostKeyChecking=no                       # Config — skip host verification
-o UserKnownHostsFile=/dev/null                # CLI — discard host key database
```

## MQTT / IoT Protocols

**Security Checks:**
- MQTT without TLS (port 1883 vs 8883)
- Anonymous MQTT connections (`allow_anonymous true`)
- Wildcard topic subscriptions (`#`) — receives all messages
- Missing ACLs on pub/sub topics
- Client IDs with predictable patterns — session hijacking
- Retained messages with sensitive data
- QoS 0 for security-critical messages (no delivery guarantee)

## LDAP / Active Directory

**Security Checks:**
- `ldap://` (plaintext) — use `ldaps://` (LDAP over TLS) or STARTTLS
- Simple bind with plaintext password over unencrypted connection
- Anonymous bind enabled — information disclosure
- LDAP injection: unsanitized user input in search filters — `(&(uid=*)(userPassword=*))`
- Missing pagination on search results — DoS via unbounded queries

**Code Patterns:**
```
# LDAP injection
ldap_search.*%s|ldap_search.*{.*}             # String interpolation in LDAP filters
# Plaintext LDAP
ldap://|LDAP_OPT_X_TLS_NEVER                 # Unencrypted LDAP
```

## Database Protocols

**Security Checks:**
| Protocol | Default Port | Secure Alternative |
|----------|-------------|-------------------|
| MySQL | 3306 | TLS (`--ssl-mode=REQUIRED`), SSH tunnel |
| PostgreSQL | 5432 | `sslmode=verify-full` |
| MongoDB | 27017 | TLS + SCRAM-SHA-256 auth |
| Redis | 6379 | TLS 6380, `requirepass`, ACLs (Redis 6+) |
| Memcached | 11211 | SASL auth, bind to localhost only |

**Code Patterns to Flag:**
```
# Unencrypted database connections
mongodb://.*localhost|mongodb://.*27017        # MongoDB without TLS
redis://                                       # Redis without TLS (use rediss://)
mysql://.*3306                                 # MySQL without SSL
sslmode=disable|sslmode=prefer                # PostgreSQL weak SSL modes
# Exposed database ports
EXPOSE 3306|EXPOSE 5432|EXPOSE 27017|EXPOSE 6379  # Dockerfiles exposing DB ports
```

## General Protocol Assessment

When analyzing a project's protocol choices, evaluate:

1. **Appropriateness:** Is the protocol choice right for the security needs?
   - Does the data sensitivity justify the protocol overhead?
   - Are there simpler, more secure alternatives? (e.g., SFTP instead of FTP)
   - Is the protocol still actively maintained and patched?

2. **Version currency:** Is the oldest supported version still considered secure?
   - Check TLS minimum version, SSH protocol version, HTTP version
   - Flag any protocol version with known unpatched vulnerabilities

3. **Configuration:** Is the protocol configured securely?
   - Cipher suites, key lengths, certificate validation
   - Authentication mechanism (mutual TLS, token-based, password)
   - Timeout and resource limits

4. **Encryption in transit:** Is all sensitive data encrypted?
   - Internal service-to-service communication (east-west traffic)
   - External API calls (north-south traffic)
   - Database connections
   - Message queue / event bus communication

5. **Authentication & Authorization:**
   - Is the protocol's auth mechanism sufficient? (e.g., Redis without auth)
   - Mutual authentication where appropriate (mTLS for service mesh)
   - Token/credential rotation strategy
