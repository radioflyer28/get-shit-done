# PHP — Security Checks

> Also load framework-specific files when detected:
> - Laravel → `frameworks/laravel.md`
> - Symfony → `frameworks/symfony.md`
> - WordPress → `frameworks/wordpress.md`

## Code Vulnerabilities (OWASP)

**Injection & Code Execution:**
- `eval($userInput)` — arbitrary code execution
- `assert($userInput)` — executes as PHP code (pre-PHP 8.0)
- `preg_replace()` with `/e` modifier (removed in PHP 7.0, but persists in legacy code)
- `create_function()` — creates function from string, effectively eval (deprecated PHP 7.2)
- `call_user_func($userControlled, ...)` / `call_user_func_array()` — arbitrary function calls
- Variable variables: `$$userInput` — overwrites arbitrary variables
- `extract($userInput)` — mass-assigns variables from array (register_globals 2.0)
- `include($userInput)` / `require($userInput)` — Local/Remote File Inclusion (LFI/RFI)
- `include("pages/" . $_GET['page'] . ".php")` — classic LFI with null byte (pre-5.3.4)
- `system()`, `exec()`, `passthru()`, `shell_exec()`, `` `backticks` `` with user input — command injection
- `popen()`, `proc_open()` with user-controlled arguments
- `unserialize($untrustedData)` — PHP Object Injection (POP chain → RCE). Use `json_decode()` or `allowed_classes` parameter
- `SimpleXMLElement($userXml)` / `DOMDocument::loadXML()` without disabling external entities (XXE)
- `libxml_disable_entity_loader(true)` — required pre-PHP 8.0 for XXE prevention

**SQL Injection:**
- String concatenation in queries: `"SELECT * FROM users WHERE id=" . $_GET['id']`
- `mysql_query()` — deprecated, no prepared statements. Use PDO or MySQLi
- `mysqli_query($conn, "SELECT ... $var")` without prepared statements
- PDO without `PDO::ATTR_EMULATE_PREPARES => false` — emulated prepares can still be injectable
- `$wpdb->query("SELECT ... $var")` without `$wpdb->prepare()` (WordPress)

**XSS:**
- `echo $_GET['name']` / `echo $userInput` without escaping
- Missing `htmlspecialchars($var, ENT_QUOTES, 'UTF-8')` — must use all 3 params
- `htmlentities()` without `ENT_QUOTES` — leaves single quotes unescaped
- `<?= $var ?>` shorthand echo without escaping
- JSON output without `JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT`
- `header("Location: $userInput")` — header injection (CRLF) and open redirect

**Path Traversal & File Operations:**
- `file_get_contents($_GET['file'])` — reads arbitrary files
- `file_put_contents($userPath, $data)` — writes arbitrary files
- `move_uploaded_file()` without validating destination path
- `$_FILES['upload']['name']` used directly as filename (path traversal + overwrite)
- `realpath()` check-then-use (TOCTOU) — validate after opening
- `glob($userPattern)` — directory enumeration
- PHP stream wrappers: `php://filter`, `php://input`, `data://`, `expect://` — used in LFI exploitation
- `phar://` deserialization attack — triggers `__destruct`/`__wakeup` via file operations

**Authentication & Session:**
- `==` loose comparison for auth: `"0e123" == "0e456"` is `true` (type juggling)
- `md5($password)` / `sha1($password)` — use `password_hash()` with `PASSWORD_ARGON2ID` or `PASSWORD_BCRYPT`
- `password_verify()` not used — manual hash comparison vulnerable to timing attacks
- `$_SESSION` without `session_regenerate_id(true)` after login — session fixation
- `session.use_strict_mode = 0` — accepts uninitialized session IDs
- `session.cookie_httponly = 0` — session cookie accessible to JavaScript
- `session.cookie_secure = 0` — session cookie sent over HTTP
- `session.cookie_samesite` not set — CSRF via session riding
- `rand()` / `mt_rand()` for tokens — use `random_bytes()` or `random_int()`

**Configuration:**
- `display_errors = On` in production — stack traces to users
- `expose_php = On` — `X-Powered-By: PHP/8.x` header reveals version
- `allow_url_include = On` — enables Remote File Inclusion
- `allow_url_fopen = On` — SSRF via `file_get_contents('http://...')`
- `open_basedir` not set — PHP can read any file the web server user can access
- `disable_functions` not configured — dangerous functions available
- `upload_max_filesize` too large without application-level validation
- `register_globals = On` (pre-PHP 5.4) — external input becomes variables
- Missing `error_reporting(0)` or `log_errors = On` + `display_errors = Off` in production

**File Upload:**
- MIME type check using only `$_FILES['file']['type']` (client-controlled, spoofable)
- Missing `finfo_file()` / `mime_content_type()` server-side validation
- Uploaded files in web-accessible directory without disabling PHP execution (`.htaccess` / nginx config)
- Double extension bypass: `shell.php.jpg` — check last extension
- Null byte bypass (pre-5.3.4): `shell.php%00.jpg`
- `.phar`, `.pht`, `.phtml`, `.php5`, `.php7` — alternative PHP extensions
- Missing file size limits at application level

## Threat Scan Patterns

**Suspicious Patterns:**
- `base64_decode()` + `eval()` — classic obfuscated backdoor
- `gzinflate(base64_decode(...))` — compressed + encoded payload
- `str_rot13()` + `eval()` — ROT13 obfuscation
- `$_REQUEST`, `$_GET`, `$_POST`, `$_COOKIE` flowing directly into `eval`/`system`/`include`
- `chmod()` / `chown()` — permission manipulation
- `fsockopen()` / `stream_socket_client()` — raw socket connections
- `curl_exec()` with user-controlled URLs — SSRF / exfiltration channel
- `mail()` with user-controlled headers — email header injection + spam relay
- `$_SERVER['HTTP_*']` headers used without sanitization (attacker-controlled)
- `php://input` reads — raw POST body processing
- Long hex/base64 encoded strings in source (obfuscated payloads)
- Files with `@eval`, `@system`, `@exec` — error suppression on dangerous functions
- `preg_replace` with `e` modifier on user input — code execution
- Webshells: single-file PHP with `$_GET`/`$_POST` → `eval`/`system` pipeline
- Files named `c99.php`, `r57.php`, `b374k.php`, `wso.php` — known webshell filenames
- `.htaccess` files with `AddType application/x-httpd-php .jpg` — disguising PHP as images
