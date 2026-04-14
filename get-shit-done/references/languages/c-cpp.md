# C / C++ — Security Checks

## Code Vulnerabilities (OWASP)

**Buffer Overflows & Memory Corruption:**
- `strcpy()`, `strcat()`, `sprintf()`, `gets()` — no bounds checking; use `strncpy()`, `strncat()`, `snprintf()`, `fgets()`
- `scanf("%s", buf)` without width specifier — use `scanf("%255s", buf)`
- Stack buffer overflows via `alloca()` with user-controlled size
- Heap overflows via `malloc(user_size)` without integer overflow checks
- Off-by-one errors in loop bounds accessing arrays
- `memcpy()`, `memmove()` with size from untrusted source
- Return address overwrite via buffer overflow (stack smashing)
- Double-free: `free(ptr); ... free(ptr);`
- Use-after-free: accessing memory after `free()`
- Dangling pointers after `realloc()`

**Format String Vulnerabilities:**
- `printf(user_input)` — attacker can read/write stack memory; use `printf("%s", user_input)`
- `syslog(priority, user_input)` — same format string risk
- `fprintf()`, `sprintf()`, `snprintf()` with user-controlled format string

**Integer Vulnerabilities:**
- Integer overflow in `malloc(count * sizeof(T))` — use `calloc(count, sizeof(T))` or check multiplication
- Signed/unsigned comparison mismatches in bounds checks
- Integer truncation when assigning `size_t` to `int`
- Negative array index via signed integer arithmetic

**Injection:**
- `system()`, `popen()` with user-controlled strings — command injection
- `execve()` / `execvp()` with unsanitized arguments
- `dlopen()` / `LoadLibrary()` with user-controlled paths — code loading
- SQL via string concatenation in embedded databases (SQLite C API)

**File I/O:**
- TOCTOU: `access()` then `open()` — race condition; use `open()` with `O_CREAT|O_EXCL`
- Symlink attacks on temp files — use `mkstemp()` instead of `tmpnam()` / `tempnam()`
- `chmod()` / `chown()` following symlinks (use `fchmod()` / `fchownat()` with `AT_SYMLINK_NOFOLLOW`)
- `realpath()` for validation but not for subsequent operations

**Crypto:**
- `rand()` / `srand()` for security — use `/dev/urandom`, `getrandom()`, or `arc4random()`
- OpenSSL with `SSL_CTX_set_verify(ctx, SSL_VERIFY_NONE, NULL)` — no cert verification
- DES, RC4, Blowfish — weak ciphers
- Hardcoded keys/IVs in source
- `EVP_MD_CTX` with MD5/SHA1 for HMAC or password hashing

**Compiler & Build Security:**
- Missing `-fstack-protector-strong` — no stack canaries
- Missing `-D_FORTIFY_SOURCE=2` — no buffer overflow detection
- Missing `-fPIE -pie` — no ASLR for executables
- Missing `-Wformat -Wformat-security` — no format string warnings
- `RPATH` / `RUNPATH` set to relative or world-writable paths — library injection
- Missing `RELRO` (`-Wl,-z,relro,-z,now`) — GOT overwrite attacks

**C++-Specific:**
- `std::string::c_str()` pointer used after string destruction — dangling pointer
- `dynamic_cast` without null check — undefined behavior on failure for references
- `reinterpret_cast` — bypasses type system, use only with extreme justification
- `std::shared_ptr` circular references — memory leaks (use `std::weak_ptr`)
- `std::vector::operator[]` without bounds checking — use `.at()` for untrusted indices
- Exception safety: resource acquisition without RAII guards
- `std::filesystem::path` construction from user input without canonicalization

## Threat Scan Patterns

**Suspicious Patterns:**
- Inline assembly (`asm`, `__asm__`) — can bypass all security controls
- `mmap(PROT_EXEC)` — executable memory mapping (shellcode injection vector)
- `ptrace()` — process tracing/debugging/anti-debugging
- `mprotect()` changing page permissions to executable
- `prctl(PR_SET_DUMPABLE, 0)` — anti-forensics
- `signal()` / `sigaction()` intercepting crash signals — crash handler backdoors
- Raw socket creation `socket(AF_INET, SOCK_RAW, ...)` — packet crafting
- Kernel module code (`init_module`, `insmod`) — ring-0 code
- Position-independent shellcode patterns (NOP sleds, `\x90`)
- `#pragma comment(lib, ...)` — silent library linking on MSVC
