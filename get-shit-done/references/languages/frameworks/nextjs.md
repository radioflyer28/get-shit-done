# Next.js — Security Checks

> Parent: `javascript-typescript.md` — always load parent first.
> Also loads: `frameworks/react.md` (Next.js uses React)

## Framework-Specific Vulnerabilities

**Server Actions & Route Handlers:**
- Server Actions (`'use server'`) are HTTP endpoints — MUST validate auth, input, and CSRF
- `cookies()` / `headers()` in Server Actions — ensure authentication before processing
- Route Handlers (`app/api/.../route.ts`) without auth middleware — public by default
- `NextResponse.json(sensitiveData)` — ensure response doesn't leak internal data
- Missing rate limiting on API routes (Next.js has no built-in rate limiting)
- `req.body` not validated with Zod/Yup — trusting client data shapes

**Server-Side Rendering (SSR) & Data Fetching:**
- `getServerSideProps` / `getStaticProps` — server-side code; can access DB, secrets
- Returning full database objects from `getServerSideProps` — over-fetching to client
- `getStaticProps` with `revalidate` — ISR can serve stale data if cache poisoned
- `__NEXT_DATA__` script tag in page source — contains all props, check for sensitive data
- `fetch()` in Server Components uses aggressive caching — `cache: 'no-store'` for auth-dependent data
- `unstable_cache` / `revalidateTag` — cache poisoning if tags are user-controlled

**Middleware (`middleware.ts`):**
- Middleware runs on Edge Runtime — limited API (no Node.js `fs`, `child_process`, etc.)
- Auth checks in middleware but not in actual route handlers — middleware can be bypassed in certain deployment configurations
- `NextResponse.rewrite()` to internal routes — SSRF if URL is user-controlled
- `NextResponse.redirect()` with user-controlled URLs — open redirect
- Missing middleware matcher — runs on every route (performance) or too narrow (security gap)

**Authentication:**
- `next-auth` / `auth.js` with default session strategy — JWT stored in cookie, verify `NEXTAUTH_SECRET` is strong
- Missing CSRF protection on non-Next.js-standard form submissions
- `getToken({ req })` without validating token claims
- Shared `NEXTAUTH_SECRET` across environments (dev/staging/prod)
- `callbacks.redirect` not validating URL — open redirect after auth

**Configuration & Deployment:**
- `next.config.js` with `images.domains: ['*']` — proxy arbitrary external images (SSRF)
- `images.remotePatterns` overly permissive — allows proxying from unintended origins
- `headers()` config missing security headers (CSP, HSTS, etc.)
- `rewrites()` / `redirects()` with user-controlled destination — open redirect / SSRF
- `.env.local` committed to git — local secrets exposed
- `NEXT_PUBLIC_*` environment variables — exposed to client bundle
- `output: 'export'` (static export) — no server-side security, all logic runs client-side
- `experimental.serverActions` without body size limit — DoS via large payloads
- `poweredByHeader: true` (default) — reveals Next.js usage

**App Router Specific:**
- `loading.tsx` / `error.tsx` — error boundaries may expose internal state
- `not-found.tsx` without proper status codes — SEO/security metadata issues
- Parallel routes (`@slot`) — ensure auth applies to all slots, not just layout
- Intercepting routes (`(.)path`) — verify auth isn't bypassed by direct URL access
- `generateMetadata` with user-controlled params — meta injection
- `dynamicParams = true` (default) — renders any param value, not just generated ones
