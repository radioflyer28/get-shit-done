# React — Security Checks

> Parent: `javascript-typescript.md` — always load parent first.

## Framework-Specific Vulnerabilities

**XSS Vectors:**
- `dangerouslySetInnerHTML={{ __html: userInput }}` — bypasses React's auto-escaping. Sanitize with DOMPurify first
- `ref.current.innerHTML = userInput` — direct DOM manipulation bypasses React's virtual DOM escaping
- `<a href={userInput}>` — if input is `javascript:alert(1)`, it executes. Validate URL scheme
- `<iframe src={userInput}>` — same protocol injection risk
- `<Component {...userControlledProps} />` — spread operator can inject `dangerouslySetInnerHTML`, `href`, event handlers
- `React.createElement(userControlledType, ...)` — arbitrary component rendering
- SVG injection via React's SVG support: `<svg dangerouslySetInnerHTML=...>`
- URL state reflected into DOM without sanitization (common in SSR hydration)

**Server Components (React 18+ / RSC):**
- Server Components can access databases, filesystems, secrets — treat as server-side code
- `'use server'` functions (Server Actions) are public API endpoints — validate ALL inputs
- Server Actions without authentication/authorization checks — anyone can call them
- Returning sensitive data from Server Components that gets serialized to client
- `cookies()`, `headers()` — server-only APIs, but values flow to client if returned
- Server Component importing client-side code (or vice versa) — data boundary confusion

**State & Data Flow:**
- Storing auth tokens in React state / Context — cleared on refresh, but exposed in devtools
- Redux/Zustand stores with sensitive data serialized to localStorage (Redux Persist)
- `useEffect` fetching data without auth token validation
- `useMemo` / `useCallback` caching sensitive computations across renders
- Error boundaries (`componentDidCatch`) capturing and displaying internal errors to users
- `React.StrictMode` disabled — hides double-render bugs that may mask state issues

**Dependencies & Build:**
- `react-scripts` / CRA: `.env` files with `REACT_APP_` prefix expose vars to client bundle
- Vite: `.env` files with `VITE_` prefix exposed to client
- Source maps (`GENERATE_SOURCEMAPS=true`) in production — exposes source code
- `window.__INITIAL_STATE__` (SSR hydration) containing sensitive server data
- `public/` directory files served without processing — check for accidentally committed secrets

**Third-Party Components:**
- Markdown renderers (`react-markdown`, `marked`) without sanitization config
- Rich text editors (Draft.js, Slate, TipTap) outputting raw HTML
- `react-helmet` / `next/head` with user-controlled meta tags — meta injection
- Charting libraries rendering user labels as HTML
