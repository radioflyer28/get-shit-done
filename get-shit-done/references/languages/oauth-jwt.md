# OAuth2 / JWT / Authentication Protocols — Security Checks

## Code Vulnerabilities (OWASP)

**JWT Vulnerabilities:**
- `alg: "none"` accepted — signature bypass, attacker forges any token
- Algorithm confusion: RS256 → HS256 — public key used as HMAC secret → signature forgery
- Missing `alg` allowlist: library accepts any algorithm in token header
- Weak HMAC secret: `jwt.sign(payload, "secret")` — brute-forceable
- HMAC secret same as other application secrets (e.g., Flask `SECRET_KEY`)
- Missing `exp` (expiration) claim — tokens valid forever
- Long expiration: `exp` set to years — stolen tokens remain valid
- Missing `iat` (issued at) claim — can't determine token age
- Missing `iss` (issuer) validation — cross-service token reuse
- Missing `aud` (audience) validation — token for Service A accepted by Service B
- `kid` (Key ID) injection: `kid: "../../../etc/passwd"` — path traversal to arbitrary key file
- `kid` SQL injection: `kid: "' UNION SELECT 'known-secret' --"` — key from database
- `jku` / `x5u` header fields pointing to attacker-controlled URL — key fetch from attacker
- JWK Set (`jwks_uri`) not validated — attacker provides their own public key
- `typ` header not validated — accepting tokens with wrong type
- JWT in URL parameter: `?token=eyJ...` — logged in access logs, browser history, referer headers
- Storing JWT in `localStorage` — XSS can steal token
- Missing token revocation — no way to invalidate compromised tokens
- Refresh token rotation missing — stolen refresh token usable indefinitely

**OAuth2 Flows:**
- Missing `state` parameter — CSRF attacks on authorization flow
- `state` parameter not random or not verified — same effect as missing
- Missing PKCE (`code_verifier` / `code_challenge`) on public clients — authorization code interception
- `redirect_uri` not strictly validated — open redirect → token theft
- `redirect_uri` validation using substring: `example.com` matches `attacker-example.com`
- `redirect_uri` with path traversal: `https://app.com/callback/../../../attacker.com`
- Implicit flow (`response_type=token`) — token in URL fragment, vulnerable to interception
- `response_type=code token` — hybrid flow exposing token in redirect
- Authorization code reuse — code should be single-use
- Missing authorization code expiration — long-lived codes increase attack window
- Missing `client_secret` on confidential clients — impersonation
- Storing `client_secret` in frontend/mobile app — not confidential
- Token endpoint without TLS — credential transmission in plaintext
- `scope` escalation: requesting broader scopes than authorized
- `claims` parameter manipulation — requesting additional user data

**Token Storage & Transmission:**
- Access token in query string: `?access_token=...` — URL logging
- Token in `Cookie` without `Secure`, `HttpOnly`, `SameSite` flags
- Token in `localStorage` — vulnerable to XSS
- Token in `sessionStorage` — better but still XSS-accessible
- Best practice: `HttpOnly` cookie for web, secure storage for mobile
- `Authorization: Bearer` header without TLS — plaintext transmission
- Token in `Referer` header — leaks to third-party resources
- Cross-origin token usage without proper CORS validation

**OpenID Connect (OIDC):**
- Missing `nonce` in ID token — replay attacks
- `nonce` not validated against session — same as missing
- ID token audience (`aud`) not validated — cross-client token reuse
- `at_hash` not verified — access token substitution
- `c_hash` not verified — authorization code substitution (hybrid flow)
- `acr` / `amr` claims not checked — accepting weaker auth levels
- Discovery endpoint (`/.well-known/openid-configuration`) cached without refresh — stale metadata
- ID token used as access token — different purpose, different validation rules

**Session Management:**
- No session binding to access token — token valid across different sessions
- Missing single logout — user logged out of app but token still valid at IdP
- Backchannel logout not implemented — IdP can't notify app of session termination
- Session fixation: session ID not rotated after OAuth callback
- Concurrent session limits not enforced — unlimited active sessions

**Token Validation:**
- JWT signature not verified — accepting any well-formed JWT
- Clock skew tolerance too large (`leeway: 3600`) — expired tokens accepted for hours
- Key rotation not handled — pinned to single key, rotation breaks validation
- JWKS endpoint polled too infrequently — new keys not picked up
- `nbf` (not before) claim not validated — future-dated tokens accepted
- Trusting claims without verification: `role: "admin"` from token without signature check
- `sub` claim not validated against local user store — phantom users

**Multi-Tenant & Federation:**
- Insufficient issuer validation: accepting tokens from any IdP
- Tenant isolation: Token from Tenant A accepted in Tenant B context
- User ID collision across tenants — same `sub` claim in different issuers
- IdP impersonation via `iss` claim on unsigned/weakly-signed tokens
- SAML assertions accepted alongside OIDC — mixed protocol confusion

## Threat Scan Patterns

**Suspicious patterns:**
- JWT libraries with `verify: false` or `algorithms: ["none"]` — intentional signature bypass
- Custom JWT parsing (regex/split on `.`) instead of using a library — homebrew crypto
- Token validation skipped for certain routes/conditions — backdoor bypass
- `alg` field read from token header and used to select verification — algorithm confusion vulnerability
- HMAC secrets derived from predictable values (hostname, app name, "changeme")
- OAuth callback endpoints that don't validate `state` — CSRF vector left open
- Token endpoints returning tokens in response body AND setting cookies — double exposure
- Custom `redirect_uri` validation with regex that doesn't anchor properly — open redirect
- JWT decode functions that catch and silently ignore verification errors
