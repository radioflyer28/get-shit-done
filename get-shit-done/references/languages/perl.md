# Perl — Security Checks

## Code Vulnerabilities (OWASP)

**Injection & Code Execution:**
- `eval($user_input)` — arbitrary code execution
- `system($user_input)` / `exec($user_input)` — command injection
- Backtick execution: `` `$user_input` `` or `qx($user_input)` — shell command execution
- `open(FH, $user_input)` — two-argument `open` allows pipe execution: `open(FH, "|cmd")` or `open(FH, "cmd|")`
- Three-argument `open(FH, '<', $file)` is safe — always prefer this form
- `open(FH, "| $user_input")` — explicit pipe open with user input
- `do $user_input` — load and execute a Perl file
- `require $user_input` — load arbitrary module
- `s/$pattern/$replacement/ee` — double-eval modifier executes replacement as code
- `$user_input->$method()` — arbitrary method calls via variable method names
- `AUTOLOAD` with insufficient validation — catches any undefined method call
- String interpolation in regex: `/$user_input/` — regex injection + code execution with `(?{...})`

**SQL Injection:**
- `$dbh->do("SELECT ... $var")` — DBI without placeholders
- `$sth = $dbh->prepare("SELECT ... WHERE id=$id")` — interpolation in prepare
- Use `$dbh->prepare("SELECT ... WHERE id=?"); $sth->execute($id)` — placeholders

**Path Traversal & File Operations:**
- `open(FH, "<$user_path")` — reads arbitrary files (and two-arg open allows commands)
- `unlink($user_input)` — delete arbitrary files
- `rename($user_input, $dest)` — move arbitrary files
- `readdir` + no path validation — directory traversal
- `File::Find::find(\&wanted, $user_dir)` — traverses arbitrary directory trees
- `use File::Spec` / `File::Basename` for safe path manipulation — don't rely on regex

**XSS & Web:**
- CGI.pm: `print $q->header; print $q->param('name')` — no escaping
- Missing HTML encoding: use `HTML::Entities::encode_entities()` or `CGI::escapeHTML()`
- `print "Content-type: text/html\n\n$user_input"` — raw output
- Template::Toolkit: `[% user_input %]` auto-escapes, but `[% user_input | none %]` disables it
- Mojolicious: `<%== $user_input %>` — raw output (unescaped)

**Authentication & Crypto:**
- `crypt($password, $salt)` — DES-based, trivially crackable. Use `Crypt::Argon2` or `Crypt::Bcrypt`
- `rand()` for tokens — predictable PRNG. Use `Crypt::URandom` or `Math::Random::Secure`
- `srand()` with time-based seed — predictable. `/dev/urandom` harvested seed is fine
- `Digest::MD5` / `Digest::SHA1` for passwords — use proper KDFs
- `eq` for token comparison — timing attack. Use `Digest::HMAC` comparison or constant-time function

**Perl-Specific Risks:**
- **Taint mode** (`-T`): Perl's built-in input validation. Check if it's enabled for CGI/web scripts
- Tainted variables used in `system`, `exec`, `open`, `eval` without untainting → Perl blocks these with `-T`
- Untainting via `($clean) = ($tainted =~ /^(.*)$/s)` — matches everything, defeats taint mode
- `no strict 'refs'` — allows symbolic references (arbitrary variable access via computed names)
- `no warnings` — hides security-relevant warnings
- `use Safe` compartment — sandbox for eval, but breakable. Not a security boundary
- `UNIVERSAL::isa` vs `->isa` — can be overridden to lie about object type

**Regular Expressions:**
- Perl regexes are powerful and dangerous:
  - `(?{ code })` — executes code during regex matching
  - `(??{ code })` — code generates regex dynamically during matching
  - `use re 'eval'` — enables code execution in regex (disabled by default for interpolated patterns)
- `$user_input =~ /$pattern/` where `$pattern` is user-controlled — ReDoS + code execution
- Missing `/s` or `/m` modifiers changing security-sensitive matching behavior
- `.` doesn't match `\n` without `/s` — multiline bypass

**Deserialization:**
- `Storable::thaw($untrusted)` — Perl object deserialization → arbitrary code via DESTROY/AUTOLOAD
- `YAML::Load($untrusted)` — can instantiate objects. Use `YAML::Safe::Load()`
- `Data::Dumper` output fed back to `eval` — common but dangerous serialization pattern
- `Sereal::Decoder` with `refuse_objects => 0` — allows object instantiation

## Threat Scan Patterns

**Suspicious Patterns:**
- `BEGIN { }` blocks — execute at compile time, before main program
- `CHECK { }`, `INIT { }`, `END { }` — lifecycle hooks (especially `END` for cleanup/persistence)
- `AUTOLOAD` catching all method calls — could intercept security-relevant calls
- `Symbol::delete_package` — erase module from symbol table (hide evidence)
- `overload` pragma on core operations — changes meaning of `+`, `==`, `""`, etc.
- `Inline::C` / `Inline::Python` — embed foreign code in Perl
- Socket operations: `IO::Socket::INET` for network connections
- `LWP::UserAgent` / `HTTP::Request` — outbound HTTP calls
- `Net::FTP` / `Net::SMTP` / `Net::Telnet` — cleartext protocol usage
- `POSIX::setuid()`, `POSIX::setgid()` — privilege changes
- `fork()` + `exec()` patterns — process spawning
- `.pl` or `.pm` files with obfuscated variable names or heavily encoded strings
- Perl one-liners embedded in shell scripts: `perl -e '...'` with suspicious payloads
- `tie` / `TIEHANDLE` — can intercept all I/O operations transparently
