# Rust — Security Checks

## Code Vulnerabilities (OWASP)

**Unsafe Code:**
- `unsafe` blocks without `// SAFETY:` comments documenting invariants
- Raw pointer dereferencing (`*const T`, `*mut T`) without bounds checking
- `std::mem::transmute()` — type-punning that can violate memory safety
- `std::slice::from_raw_parts()` with incorrect length — buffer over-read
- FFI (`extern "C"`) without input validation at the boundary

**Error Handling:**
- `.unwrap()` on user input or network results — panics in production
- `.expect()` with messages exposing internal details
- `panic!()` in library code (should return `Result`)
- Missing `?` propagation leading to swallowed errors

**Injection:**
- `std::process::Command::new()` with user-controlled program/args
- SQL injection via string formatting with `rusqlite`, `diesel`, `sqlx`
- `format!()` used to build shell commands or SQL queries

**Crypto & Randomness:**
- `rand::thread_rng()` in WASM targets (may not be cryptographically secure)
- Custom crypto implementations instead of `ring`, `rustcrypto`
- Hardcoded keys/nonces in source

**Dependencies:**
- `build.rs` scripts that download or execute external code
- `[patch]` or `[replace]` sections in `Cargo.toml` pointing to git repos
- `links` key in `Cargo.toml` with custom build scripts

## Threat Scan Patterns

**Suspicious Patterns:**
- `std::process::Command` in libraries that shouldn't spawn processes
- `libc` crate with `libc::system()` calls — C-level command execution
- `include_bytes!()` / `include_str!()` — compile-time file embedding (verify contents)
- `proc_macro` crates that generate unusual code at compile time
- `#[link]` attributes to unexpected native libraries
- `mmap` / memory-mapped file access in unexpected contexts
