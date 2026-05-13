# Kotlin — Security Checks

> Kotlin inherits all JVM/Android vulnerabilities from Java. This file covers Kotlin-specific patterns. **Always also load `java.md` when scanning Kotlin code.**

## Code Vulnerabilities (OWASP)

**Kotlin-Specific Injection:**
- String templates in SQL: `"SELECT * FROM users WHERE id=$userId"` — use parameterized queries
- `ProcessBuilder(listOf("sh", "-c", userInput))` — command injection via template strings
- `Runtime.getRuntime().exec(arrayOf("sh", "-c", "$userCommand"))` — injection in interpolated strings

**Null Safety Misuse:**
- `!!` (non-null assertion) on user input or network responses — throws `NullPointerException` in production
- `as` (unsafe cast) instead of `as?` (safe cast) on external data
- `lateinit var` for security-critical fields — can be accessed before initialization
- `lazy {}` delegates with thread-safety mode `NONE` in concurrent contexts

**Coroutine Security:**
- `GlobalScope.launch {}` — unstructured concurrency, leaked coroutines
- `Dispatchers.IO` for crypto operations (predictable thread pool, potential side-channel)
- `supervisorScope` masking failures in child coroutines that should propagate
- Missing `withTimeout()` on network calls (allows indefinite hangs)
- Exception swallowing in `CoroutineExceptionHandler`

**Data Classes & Serialization:**
- Data class `toString()` including sensitive fields (passwords, tokens) — override to redact
- `@Serializable` data classes with `@Transient` not applied to sensitive fields
- Kotlin serialization `Json.decodeFromString<T>(userInput)` with polymorphic types
- `copy()` on data classes can clone security tokens/session objects unintentionally

**Android Kotlin-Specific:**
- Jetpack Compose: `AndroidView` embedding `WebView` without security config
- `collectAsState()` in Compose exposing sensitive ViewModel state to previews
- `remember {}` caching sensitive data beyond intended lifecycle
- `Navigation` deep links without argument validation
- `DataStore` without encryption for sensitive preferences
- `WorkManager` scheduling tasks that transmit data without connectivity constraints

**Multiplatform (KMP):**
- `expect`/`actual` implementations diverging in security behavior across platforms
- Platform-specific crypto not using common abstracted interface
- `ktor` client without explicit engine TLS configuration

## Threat Scan Patterns

**Suspicious Patterns:**
- `kotlin.reflect` accessing private members
- `Class.forName()` with computed class names
- Extension functions on system types that modify security behavior
- `@JvmStatic` methods hiding backdoor entry points in companion objects
- Sealed class `else` branches that execute unexpected code
- `inline` functions in third-party libraries (inlined at call site, hard to audit)
- `crossinline` / `noinline` lambdas with captured sensitive data
