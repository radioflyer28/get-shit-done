# Go — Security Checks

## Code Vulnerabilities (OWASP)

**Injection:**
- `fmt.Sprintf` in SQL queries — use parameterized queries (`db.Query("... WHERE id = ?", id)`)
- `os/exec.Command()` with user-controlled arguments without validation
- `html/template` vs `text/template` confusion — `text/template` does NOT escape HTML
- `database/sql` with string concatenation in query strings

**Network & TLS:**
- `http.ListenAndServe` without TLS (use `http.ListenAndServeTLS`)
- `&tls.Config{InsecureSkipVerify: true}` — disables certificate validation
- Missing `context.Context` timeout on HTTP clients (`http.Client{Timeout: ...}`)
- `net.Listen("tcp", ":0")` binding to all interfaces without intent
- Missing `ReadTimeout`, `WriteTimeout`, `IdleTimeout` on `http.Server`

**Memory & Type Safety:**
- `unsafe` package usage without justification — bypasses Go's type safety
- `reflect` with user-controlled type/field names
- `cgo` calls to C code — inherits all C vulnerability classes
- Integer overflow in `int` calculations (Go ints are platform-dependent width)

**Concurrency:**
- Race conditions: shared variables without mutex/channel synchronization
- `sync.Mutex` not covering full critical section
- Goroutine leaks (goroutines without cancellation/timeout)
- Deferred `mu.Unlock()` with panic potential (lock never released)

**Crypto:**
- `crypto/md5`, `crypto/sha1` for security purposes (use `crypto/sha256` minimum)
- `math/rand` for security tokens (use `crypto/rand`)
- Hardcoded keys/IVs in source

**Error Handling:**
- Ignored errors: `result, _ := riskyFunction()` — can mask security failures
- `panic()` / `log.Fatal()` in library code (should return errors)
- Error messages exposing internal paths or stack traces to users

## Threat Scan Patterns

**Suspicious Patterns:**
- `os/exec` + `syscall` combination — shell execution with low-level control
- `net.Dial` to unexpected addresses in non-networking packages
- `//go:generate` directives running external commands
- `plugin.Open()` — dynamic loading of shared libraries
- `os.Setenv` / `os.Unsetenv` — environment manipulation
- `init()` functions with network calls or file writes (run before `main()`)
