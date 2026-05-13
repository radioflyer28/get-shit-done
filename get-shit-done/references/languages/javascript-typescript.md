# JavaScript / TypeScript — Security Checks

> Also load framework-specific files when detected:
> - React → `frameworks/react.md`
> - Next.js → `frameworks/nextjs.md`
> - Vue / Nuxt → `frameworks/vue.md`
> - Angular → `frameworks/angular.md`
> - Svelte / SvelteKit → `frameworks/svelte.md`
> - Express → `frameworks/express.md`

## Code Vulnerabilities (OWASP)

**Injection & Code Execution:**
- `eval()`, `Function()` constructor with user input
- `setTimeout(string, ...)` / `setInterval(string, ...)` — acts as eval when passed strings
- `child_process.exec()` with interpolated strings (use `execFile()` or `spawn()` with arrays)
- Template literal injection in shell commands: `` `rm ${userInput}` ``
- `vm.runInNewContext()` / `vm.Script` with untrusted code (vm module is NOT a sandbox)

**DOM & XSS:**
- `innerHTML`, `outerHTML` with user-controlled content
- `dangerouslySetInnerHTML` in React without sanitization
- `document.write()`, `document.writeln()`
- `element.insertAdjacentHTML()` with user input
- `location.href = userInput` — open redirect / javascript: protocol XSS
- jQuery `$()` / `.html()` with user input

**Prototype Pollution:**
- `obj[key] = value` where `key` is user-controlled (can set `__proto__`, `constructor.prototype`)
- Deep merge/clone utilities without prototype checks: `lodash.merge()`, `lodash.defaultsDeep()` (patched in recent versions)
- `Object.assign({}, userObj)` does not prevent `__proto__` keys
- Query string parsers that create nested objects from dots/brackets

**Deserialization:**
- `JSON.parse()` + `eval()` combination
- `serialize-javascript` with user input
- `node-serialize` / `funcster` — known RCE via deserialization

**Path Traversal (Node.js):**
- `path.join(base, userInput)` without checking result is under base
- `fs.readFile(userInput)` without allowlist
- `express.static()` serving directories above intended root
- `res.sendFile()` with user-controlled path

**Authentication & Crypto:**
- `Math.random()` for tokens/secrets (use `crypto.randomBytes()` or `crypto.randomUUID()`)
- JWT with `algorithm: 'none'` accepted, or weak HMAC secrets
- Missing `httpOnly`, `secure`, `sameSite` flags on auth cookies
- `bcrypt` with cost factor < 10

**Framework-Specific:**
- Express: missing `helmet` middleware, CORS wildcard on authenticated routes
- Next.js: `getServerSideProps` leaking server-only data to client, missing API route auth
- React: `dangerouslySetInnerHTML`, unescaped URL parameters in `href`
- Angular: `bypassSecurityTrustHtml()`, disabled `DomSanitizer`

**RegExp (ReDoS):**
- `new RegExp(userInput)` — user-controlled regex patterns
- Nested quantifiers in regex literals: `/(a+)+$/`, `/(a|b)*c/`
- Missing `.source` sanitization when building regex from user strings

## Threat Scan Patterns

**Suspicious Patterns:**
- `require()` with computed/concatenated paths — dynamic module loading
- `process.env` bulk access (`Object.keys(process.env)`) — env harvesting
- `child_process` + `Buffer.from(..., 'base64')` — encoded command execution
- `http.createServer` or `net.createServer` in unexpected modules — hidden listeners
- `process.binding()` — low-level Node internals access
- `require('module')._resolveFilename` — module resolution manipulation

**npm-Specific Supply Chain:**
- `preinstall` / `postinstall` scripts with `curl`, `wget`, or `node -e`
- `.npmrc` files with `registry` pointing to non-default registries
- `package.json` `bin` entries pointing to unexpected scripts
- `bundledDependencies` with packages not in public registry
