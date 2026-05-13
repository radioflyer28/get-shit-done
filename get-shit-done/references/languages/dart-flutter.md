# Dart / Flutter — Security Checks

## Code Vulnerabilities (OWASP)

**Data Storage:**
- `SharedPreferences` for sensitive data — unencrypted; use `flutter_secure_storage` (wraps Keychain/Keystore)
- `sqflite` database without encryption — use `sqflite_sqlcipher` or `drift` with encryption
- `path_provider` storing secrets in `getApplicationDocumentsDirectory()` — accessible via backup; use `getApplicationSupportDirectory()` with encryption
- `Hive` without encryption for sensitive data
- `print()` / `debugPrint()` with sensitive data — persists in device logs in release builds
- `dart:developer` `log()` in production — remove or gate behind `kDebugMode`

**Network & Transport:**
- `HttpClient` with `badCertificateCallback: (cert, host, port) => true` — disables TLS verification
- `dio` interceptors logging request/response bodies containing auth tokens
- Missing certificate pinning for sensitive APIs
- `http` package without base URL validation — SSRF
- WebSocket (`web_socket_channel`) connections without origin validation
- `Uri.parse(userInput)` without scheme validation — `javascript:` or `file:` protocol abuse

**Injection & Code Execution:**
- `dart:mirrors` (reflection) — code introspection, disabled in AOT but available in development
- `Process.run()` / `Process.start()` with user-controlled arguments
- `WebView` (`webview_flutter`, `flutter_inappwebview`) with `javaScriptMode: JavaScriptMode.unrestricted` loading untrusted content
- `WebView.addJavaScriptChannel()` / `JavaScriptHandlerCallback` exposing Dart methods to JavaScript
- Deep link handlers without URL/parameter validation
- `Uri.parse()` for deep link routing without checking scheme/host

**Authentication & Crypto:**
- `dart:math` `Random()` for tokens — use `Random.secure()` or `dart:typed_data` with platform crypto
- `package:crypto` SHA1/MD5 for password hashing — use `package:bcrypt` or Argon2
- Hardcoded API keys in Dart source (compiled to app binary, extractable)
- Missing biometric auth timeout/re-authentication for sensitive operations
- OAuth tokens stored in `SharedPreferences` instead of secure storage
- JWT validation done client-side only (server must validate)

**Flutter-Specific:**
- `TextField` for passwords without `obscureText: true`
- Sensitive data visible in widget tree inspector (`Flutter DevTools`)
- `RepaintBoundary` + `toImage()` capturing sensitive screens — screenshot vulnerability
- Missing `SecurityContext` configuration on `HttpClient`
- `Platform.isAndroid` / `Platform.isIOS` conditional logic with security implications diverging
- `MethodChannel` / `EventChannel` without authentication for platform channel calls
- `BackdropFilter` / overlay widgets not preventing background app screenshot
- Custom fonts loading from network without integrity checks

**State Management:**
- `Provider` / `Riverpod` / `Bloc` exposing sensitive state to widget tree inspectors
- `GetStorage` (GetX) — unencrypted local storage
- State persistence serializing auth tokens to disk
- `ChangeNotifier` with sensitive fields included in `toString()`

## Threat Scan Patterns

**Suspicious Patterns:**
- `dart:ffi` — foreign function interface to native code
- `dart:isolate` spawning isolates that communicate with external services
- `DeviceInfoPlugin` / `package_info_plus` — device fingerprinting
- `geolocator` / `location` — tracking without clear UI justification
- `contacts_service` / `permission_handler` requesting excessive permissions
- `url_launcher` with computed URLs — potential exfiltration
- `path_provider` accessing/scanning directories outside app sandbox
- `connectivity_plus` status checks gating data transmission behavior
- `.env` files or `.dart_tool/` committed to source
- `build.yaml` with custom builders that execute code during build
