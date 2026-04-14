# Laravel — Security Checks

> Parent: `php.md` — always load parent first.

## Framework-Specific Vulnerabilities

**Mass Assignment:**
- Missing `$fillable` or `$guarded` on Eloquent models — all attributes mass-assignable
- `$guarded = []` — explicitly allows mass assignment of everything (worse than missing it)
- `User::create($request->all())` — assigns every submitted field including `is_admin`, `role`, etc.
- Use `$request->only(['name', 'email'])` or `$request->validated()` with Form Requests

**SQL Injection (despite Eloquent):**
- `DB::raw($userInput)` — raw SQL expression injection
- `whereRaw("status = $var")` — injection in raw where
- `selectRaw($userInput)`, `orderByRaw($userInput)`, `groupByRaw($userInput)` — all accept raw SQL
- `DB::statement("ALTER TABLE ... $var")` — DDL injection
- Column name from user input: `->orderBy($request->sort)` — SQL injection via column name
- `havingRaw()`, `joinSub()` with interpolated strings

**Authentication & Authorization:**
- Missing `auth` middleware on routes — public by default
- `Gate::define()` / `Policy` returning `true` without checks
- `$request->user()` without verifying relationship: `Post::find($id)` instead of `$request->user()->posts()->findOrFail($id)` — IDOR
- `api` guard with Sanctum/Passport — ensure token scopes are validated
- `Auth::loginUsingId($request->id)` — auth bypass if `$request->id` is user-controlled
- Missing `EnsureEmailIsVerified` middleware on sensitive routes
- `password` field in `$visible` on User model — password hash exposed in API responses

**Blade Templates:**
- `{!! $userInput !!}` — raw/unescaped output → XSS
- `{{ }}` is safe (auto-escaped), but developers bypass with `{!! !!}` for "HTML content"
- `@php echo $userInput; @endphp` — raw PHP in template, no escaping
- `@json($data)` — safe for JSON, but if inside an onclick attribute: XSS
- `@include($userInput)` — template injection (include arbitrary views)
- `@extends($userInput)` — layout injection

**File Upload & Storage:**
- `$request->file('avatar')->storeAs('public', $request->filename)` — user-controlled filename → path traversal
- `Storage::url()` returning predictable paths — enumeration of uploaded files
- Missing `mimes` / `mimetypes` validation — upload PHP files as images
- `public` disk in `filesystems.php` — files in `storage/app/public` accessible via symlink
- `Storage::disk('local')->get($request->path)` — path traversal to read arbitrary files

**CSRF & Sessions:**
- Removing `VerifyCsrfToken` middleware — all POST/PUT/DELETE vulnerable to CSRF
- Adding routes to `$except` in VerifyCsrfToken without alternative protection (e.g., API tokens)
- `SESSION_DRIVER=file` (default) — session files on shared hosting readable by other users; use `redis` or `database`
- `SESSION_SECURE_COOKIE=false` — session cookie sent over HTTP
- Missing `SESSION_SAME_SITE_COOKIE=lax` — CSRF via cookies

**Configuration & Deployment:**
- `APP_DEBUG=true` in production — Ignition error page = full stack traces, env vars, queries
- `APP_KEY` committed to `.env` in git — encryption/signing key exposed
- `APP_KEY` identical across environments — staging can forge production sessions
- `DEBUGBAR_ENABLED=true` in production — exposes queries, routes, auth state
- `TELESCOPE_ENABLED=true` without auth gate — telescope dashboard publicly accessible
- `.env` file accessible via web: `curl site.com/.env` — misconfigured web server
- `config/app.php` `'debug' => true` hardcoded — overrides `.env`
- `Log::info($request->all())` — logging passwords, tokens, credit cards
- `register_shutdown_function` or custom error handlers overriding Laravel's — may expose internals

**Routing:**
- `Route::any()` — accepts GET, POST, PUT, etc. — CSRF issues since GET is exempt
- Route model binding with `withTrashed()` — accessing soft-deleted resources
- Missing `throttle` middleware on login/API routes — brute force
- `api.php` routes without `auth:sanctum` middleware — public API
- Signed URLs (`URL::signedRoute`) with long expiration — persistent access tokens

**Queues & Jobs:**
- Serialized job payloads stored in database/Redis — sensitive data in queue storage
- Failed jobs table (`failed_jobs`) storing full payload including user data
- `ShouldBeUnique` not used — duplicate job processing  
- `$this->delete()` not called on permanent failures — infinite retry loops
