# Java — Security Checks

> Also load framework-specific files when detected:
> - Spring / Spring Boot → `frameworks/spring.md`

## Code Vulnerabilities (OWASP)

**Injection & Code Execution:**
- `Runtime.getRuntime().exec()` with user-controlled arguments
- `ProcessBuilder` with unsanitized input
- String concatenation in SQL: `"SELECT * FROM users WHERE id=" + userId` — use `PreparedStatement`
- JNDI injection: `InitialContext.lookup(userInput)` — RCE via `ldap://`, `rmi://` (Log4Shell class)
- Expression Language (EL) injection in JSP/JSF: `${userInput}`
- `ScriptEngine.eval()` with user-controlled scripts
- `javax.xml.parsers` without disabling external entities (XXE)

**Deserialization:**
- `ObjectInputStream.readObject()` on untrusted data — arbitrary code execution
- `XMLDecoder` on untrusted XML
- `Kryo`, `Hessian`, `AMF` deserialization without class allowlists
- `readResolve()` / `readObject()` custom deserializers without validation
- Jackson `@JsonTypeInfo` / `enableDefaultTyping()` with polymorphic types (RCE)
- SnakeYAML `yaml.load()` without `SafeConstructor`

**Path Traversal & File I/O:**
- `new File(userInput)` without canonicalization
- `java.nio.file.Paths.get(userInput)` without checking against base directory
- `ZipInputStream` without checking for path traversal in entry names (Zip Slip)
- `ClassLoader.getResource(userInput)` with user-controlled paths
- Temp files with predictable names (`File.createTempFile` with weak prefixes)

**Crypto & Auth:**
- `java.util.Random` for security tokens — use `java.security.SecureRandom`
- `MessageDigest.getInstance("MD5")` / `"SHA-1"` for passwords — use `BCrypt`, `PBKDF2`, `Argon2`
- `Cipher.getInstance("DES")`, `"DESede"`, `"RC4"` — weak ciphers
- `Cipher.getInstance("AES")` without mode/padding (defaults to ECB)
- `TrustManager` that accepts all certificates (`X509TrustManager` with empty `checkServerTrusted`)
- `HostnameVerifier` returning `true` always
- Hardcoded passwords in `DataSource` configuration

**Concurrency:**
- `synchronized` blocks not covering full check-then-act sequences
- `volatile` misuse (doesn't provide atomicity for compound operations)
- `ConcurrentHashMap` with check-then-put race conditions
- `SimpleDateFormat` shared between threads (not thread-safe)

**Android-Specific:**
- `android:debuggable="true"` in release `AndroidManifest.xml`
- `android:exported="true"` on Activities/Services/Receivers without intent filters
- `android:allowBackup="true"` — app data extractable via adb
- `WebView.addJavascriptInterface()` — exposes Java objects to JavaScript (RCE on API < 17)
- `SharedPreferences` for sensitive data — use EncryptedSharedPreferences
- `MODE_WORLD_READABLE` / `MODE_WORLD_WRITEABLE` on files
- Content Providers without proper permissions (`android:permission`)
- `PendingIntent` with `FLAG_MUTABLE` and implicit intent — hijackable
- Missing `NetworkSecurityConfig` for certificate pinning
- `MediaProjection` / screen capture without user awareness
- `AccessibilityService` abuse for keylogging
- Broadcast receivers for `SMS_RECEIVED` — message interception

**Spring Framework:**
- SpEL injection: `ExpressionParser.parseExpression(userInput)`
- Missing `@PreAuthorize` / `@Secured` on controller methods
- `CSRF` disabled: `.csrf().disable()` in security config
- Actuator endpoints exposed without authentication (`/actuator/env`, `/actuator/heapdump`)
- `@RequestMapping` without method restriction (accepts all HTTP methods)

## Threat Scan Patterns

**Suspicious Patterns:**
- `System.getenv()` iterating all environment variables
- `java.lang.reflect` for accessing private fields/methods
- `sun.misc.Unsafe` — unrestricted memory access
- `java.net.Socket` connections in libraries that shouldn't network
- `java.lang.instrument` / `Instrumentation` — bytecode manipulation at runtime
- `javax.management` (JMX) — remote management interface
- `java.rmi` — Remote Method Invocation without registry auth
- Classloader manipulation: `URLClassLoader` loading remote classes
- `ProGuard` / `R8` rules that are overly aggressive (hiding code structure)
