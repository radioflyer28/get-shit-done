# Svelte / SvelteKit — Security Checks

> Parent: `javascript-typescript.md` — always load parent first.

## Framework-Specific Vulnerabilities

**XSS & Template Injection:**
- `{@html userInput}` — renders raw HTML, bypasses Svelte's auto-escaping. Sanitize with DOMPurify
- `{ }` interpolation in templates is safe (auto-escaped)
- `<svelte:element this={userInput}>` — arbitrary element type rendering
- `<svelte:component this={userControlledComponent}>` — arbitrary component rendering
- `action:` directives with user-controlled parameters
- `bind:innerHTML` on contenteditable elements — unsanitized HTML via binding
- `$$props` / `$$restProps` spread — can inject arbitrary attributes including event handlers

**SvelteKit — Server-Side:**
- `+page.server.ts` / `+server.ts` — server-only code; can access secrets, DB
- `+page.server.ts` `load()` returning sensitive data — serialized to client via `__data` JSON
- `+server.ts` (API routes) without auth checks — public by default
- `form actions` — POST handler, validate auth + input (not just `+page.server.ts` load)
- `event.locals` — server-side request context; if populated in `hooks.server.ts`, ensure auth
- `event.cookies` — server-side cookie access; set `path`, `httpOnly`, `secure`, `sameSite`
- `event.fetch` — server-side fetch that forwards cookies; leaking auth to third-party APIs
- `event.url.searchParams` used without validation in DB queries — injection

**SvelteKit — Hooks:**
- `hooks.server.ts` `handle()` — runs on every request; auth middleware goes here
- Missing auth in `handle()` — all routes are public
- `resolve(event, { transformPageChunk })` — can modify HTML response; injection point
- `hooks.client.ts` `handleError()` — client error handler; don't expose stack traces
- `handleFetch()` — intercepts all server-side fetch; can be used to add auth headers (or leak them)

**SvelteKit — Environment:**
- `$env/static/private` — compile-time private env vars; never import in client code
- `$env/static/public` — compile-time public vars; exposed to client
- `$env/dynamic/private` — runtime private vars
- `$env/dynamic/public` — runtime public vars; exposed to client
- Importing `$env/static/private` in `+page.svelte` — build error (good!), but not in `+page.ts` (runs on client during client-side navigation)
- `+page.ts` (universal load) vs `+page.server.ts` (server load) — universal load runs on BOTH client and server; never put secrets in universal load

**State & Stores:**
- Svelte stores (`writable`, `readable`) in SSR — shared across requests if defined at module scope (request pollution)
- `$app/stores` (`page`, `navigating`, `updated`) — safe; per-request in SSR
- Custom stores at module scope in `+layout.ts` — shared across users in SSR
- `derived` stores computing sensitive values — derived from potentially polluted parent

**Data Loading:**
- `+page.ts` `load()` — runs on server AND client; don't put server-only logic here
- `depends()` / `invalidate()` with user-controlled keys — cache invalidation attacks
- `parent()` — loads parent layout data; ensure parent doesn't return extra sensitive data
- Streaming with `event.cookies` — ensure auth is checked before stream starts

**Forms & Actions:**
- Form actions without CSRF protection — SvelteKit includes CSRF by default (`checkOrigin`), but can be disabled
- `csrf: false` in `svelte.config.js` — disables origin checking
- `fail()` returning user input in error messages — reflected input
- File uploads in form actions without size/type validation

**Configuration:**
- `svelte.config.js` `csrf.checkOrigin: false` — disables CSRF protection
- `adapter-static` — full static export; no server-side security
- Missing `Content-Security-Policy` header in hooks
- `kit.paths.base` with path traversal value — affects all route resolution
