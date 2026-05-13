# Vue.js — Security Checks

> Parent: `javascript-typescript.md` — always load parent first.

## Framework-Specific Vulnerabilities

**XSS & Template Injection:**
- `v-html="userInput"` — renders raw HTML, bypasses Vue's auto-escaping. Sanitize with DOMPurify
- `{{ }}` interpolation is safe (auto-escaped), but `v-html` is not
- Template compilation from user input: `Vue.compile(userString)` or `new Vue({ template: userString })` — template injection → XSS
- `v-bind:href="userInput"` / `:href="userInput"` — `javascript:` protocol injection
- `v-bind:[userControlledAttr]="value"` — dynamic attribute name injection
- `v-on:[userControlledEvent]` — dynamic event handler binding
- Rendering user content as component names: `<component :is="userInput" />` — arbitrary component rendering
- SSR: `renderToString()` output inserted into HTML without escaping server-side data

**Vue Router:**
- `router.push(userInput)` / `router.replace(userInput)` — open redirect if accepting full URLs
- Navigation guards (`beforeEach`) skipped on direct URL access in SSR mode
- Route params used in API calls without validation: `this.$route.params.id`
- `<router-link :to="userInput">` — same redirect risk as `router.push`
- Lazy route loading revealing route structure to client

**State Management (Vuex / Pinia):**
- `store.state` serialized to `window.__INITIAL_STATE__` in SSR — contains full state tree
- Pinia stores with sensitive data persisted via `pinia-plugin-persistedstate` to localStorage
- Vuex mutations called from devtools in production (disable Vuex devtools plugin: `strict: false` in prod)
- Actions making API calls without re-validating auth tokens

**Nuxt.js Specific:**
- `useAsyncData` / `useFetch` — server-side; can access secrets, DB
- `server/api/` routes — server-only, but public endpoints (validate auth)
- `server/middleware/` — runs on every server request, auth checks here are global
- `runtimeConfig` vs `appConfig` — `runtimeConfig.public` is exposed to client
- `NUXT_` env vars populate `runtimeConfig` — ensure private vars don't have `public.` prefix
- `useRequestHeaders()` — forwards client headers (cookie, auth) to internal API calls; can leak tokens to third-party APIs
- `useCookie()` — accessible server + client; ensure `httpOnly`, `secure`, `sameSite`
- Server plugins (`server/plugins/`) with database connections — connection string exposure
- `nitro.storage` — filesystem access from server; validate paths

**Composition API:**
- `ref()` / `reactive()` holding sensitive data — exposed in Vue Devtools
- `provide/inject` with sensitive context — any descendant component can inject
- `watchEffect` triggering API calls — ensure cleanup on unmount
- `toRaw()` bypassing Vue's reactivity — can leak proxy internals

**Build & Config:**
- `vite.config.ts` with `define: { 'process.env': ... }` — may leak env vars to client
- `VITE_` prefixed env vars exposed to client bundle
- Vue Devtools enabled in production (`__VUE_DEVTOOLS_GLOBAL_HOOK__`)
- Source maps in production build
