# Express.js — Security Checks

> Parent: `javascript-typescript.md` — always load parent first.

## Framework-Specific Vulnerabilities

**Middleware & Routing:**
- Missing `helmet` middleware — no security headers (CSP, HSTS, X-Content-Type-Options, etc.)
- `app.use(cors())` without options — allows all origins (`Access-Control-Allow-Origin: *`)
- `cors({ origin: true, credentials: true })` — reflects any origin with credentials (credential theft)
- Middleware order matters: auth middleware declared AFTER routes it should protect
- `app.use(express.json({ limit: '100mb' }))` — DoS via large payloads; default 100kb is usually sufficient
- `app.use(express.urlencoded({ extended: true }))` — `extended: true` uses `qs` library; nested object injection
- Missing `express.json()` middleware — `req.body` is undefined, leading to crashes
- `app.all('*', handler)` — catches all methods including OPTIONS (CORS preflight interference)
- Error handler `(err, req, res, next)` returning `err.stack` — stack trace to client

**Injection:**
- `req.params.id` used directly in MongoDB: `db.find({ _id: req.params.id })` — NoSQL injection if not ObjectId-validated
- `req.query` is always strings (or string arrays) — `req.query.admin === true` is always false; type coercion bugs
- `req.body` with `express.json()` can contain nested objects — prototype pollution via `__proto__`, `constructor`
- Template injection: `res.render('template', { title: req.query.name })` — safe in most engines, but check for raw output modes
- `res.redirect(req.query.url)` — open redirect
- `res.sendFile(req.params.path)` — path traversal; use `{ root: __dirname }` option
- `res.download(userPath)` — arbitrary file download; validate against allowlist
- SQL injection via `req.query` in raw queries

**Sessions & Authentication:**
- `express-session` with default `MemoryStore` — leaks memory, shared state in production; use Redis/Mongo store
- `express-session` without `secure: true` on cookie — session cookie sent over HTTP
- Missing `name` option — default cookie name `connect.sid` reveals Express usage
- `resave: true` — race conditions on concurrent requests overwriting session
- `saveUninitialized: true` — creates session for every visitor (tracking + storage waste)
- `cookie.sameSite` not set — CSRF via session cookies
- JWT in `Authorization` header but not validated per-route — middleware applied globally but some routes expect different auth
- `passport.js` with `failureRedirect` to user-controlled URL — open redirect
- `passport.deserializeUser` not checking if user still exists — deleted users retain sessions

**Rate Limiting & DoS:**
- No `express-rate-limit` — unlimited requests
- Rate limit on IP only — bypassable via proxies; use `trust proxy` + user-based limits
- `app.set('trust proxy', true)` — trusts ALL proxies; use specific count or IP range
- Missing `slowDown` middleware — no graceful backoff before hard rate limit
- No request timeout — `req.setTimeout()` or `server.timeout` not set; hanging connections exhaust resources

**File Uploads:**
- `multer` without `limits.fileSize` — unlimited upload size
- `multer({ dest: 'uploads/' })` in web root — uploaded files directly accessible
- Missing file type validation (MIME type + magic bytes)
- `multer.diskStorage.filename` using `file.originalname` — path traversal
- `bodyParser.raw({ limit: '10gb' })` — memory exhaustion

**Configuration:**
- `app.set('x-powered-by', true)` (default) — reveals Express; `app.disable('x-powered-by')` or use helmet
- `app.set('env', 'development')` in production — verbose errors, hot reloading
- `NODE_ENV !== 'production'` branches with debug endpoints
- `app.set('view engine', 'ejs')` — EJS with `<%- var %>` is unescaped; use `<%= var %>`
- `.env` file with secrets + missing `.gitignore` entry
- `morgan('dev')` logging in production — verbose request logging including auth headers
