# Lua (Corona SDK / Solar2D) — Security Checks

## Code Vulnerabilities (OWASP)

**Code Execution & Injection:**
- `loadstring(userInput)` / `load(userInput)` — executes arbitrary Lua code
- `dofile(userInput)` / `loadfile(userInput)` — loads and executes file from user-controlled path
- `os.execute(command)` with user-controlled strings — command injection
- `io.popen(command)` — command execution with output capture
- `debug.getinfo()`, `debug.sethook()` — runtime introspection that can alter program flow
- `rawset(_G, "func", malicious_func)` — global table manipulation
- `require(userInput)` — loads arbitrary modules
- String-to-function via `loadstring("return " .. userInput)()` — common Lua eval pattern

**File I/O & Path Traversal:**
- `io.open(userInput)` without path validation
- `system.pathForFile(userInput, system.DocumentsDirectory)` — path traversal possible
- `lfs.dir(userInput)` (LuaFileSystem) — directory enumeration
- `lfs.attributes(userInput)` — file metadata disclosure
- `os.remove(userInput)` / `os.rename(userInput, ...)` — file manipulation

**Network Security:**
- `network.request(userControlledUrl, ...)` — SSRF
- `socket.connect(userHost, userPort)` (LuaSocket) — arbitrary connections
- Missing TLS: `http://` instead of `https://` in API calls
- `network.download()` without integrity verification
- Custom socket protocols without encryption

**Data Storage (Corona/Solar2D Specific):**
- `system.setPreferences("app", { secret = token })` — unencrypted preferences
- `json.encode(sensitiveTable)` written to `system.pathForFile(name, system.DocumentsDirectory)` — plaintext on disk
- `sqlite3.open(dbPath)` without encryption
- `io.write()` storing credentials in plaintext files
- `system.getPreference("app", key)` accessible by other apps on rooted devices

**Crypto:**
- `math.random()` / `math.randomseed()` for security tokens — predictable PRNG
- Custom crypto implementations in Lua (slow, likely flawed)
- Missing `openssl` or `crypto` library for proper crypto operations
- Base64 "encryption" — encoding is not encryption

**Sandbox Escapes:**
- `os.*` library available (should be removed/sandboxed in production)
- `io.*` library available (filesystem access should be restricted)
- `debug.*` library available in production (should be disabled)
- `package.path` / `package.cpath` modification — load arbitrary native modules
- `ffi` library (LuaJIT) — direct C function calls, memory access
- Metatables with `__index` / `__newindex` pointing to unexpected functions

## Threat Scan Patterns

**Suspicious Patterns:**
- `os.getenv()` — environment variable harvesting
- `socket.dns.toip()` / `socket.dns.tohostname()` — DNS resolution for recon
- `os.clock()` / `os.time()` in conditional logic — time bombs
- `debug.getregistry()` — access to internal Lua registry
- `collectgarbage("count")` — memory probing
- `coroutine.create()` with network calls in unexpected modules
- `package.loadlib()` — load arbitrary C libraries
- `string.dump(function)` — serialize function bytecode (can be exfiltrated/modified)
- `.so` / `.dll` files alongside Lua scripts — native modules to audit separately
- Obfuscated variable/function names in production Lua files
