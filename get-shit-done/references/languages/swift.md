# Swift — Security Checks

## Code Vulnerabilities (OWASP)

**Data Storage:**
- Storing sensitive data in `UserDefaults` (unencrypted plist on disk) — use Keychain instead
- `NSCoding` / `NSKeyedUnarchiver.unarchiveObject(with:)` on untrusted data — arbitrary code execution; use `NSSecureCoding` with `unarchivedObject(ofClass:from:)`
- Core Data SQLite store without `NSPersistentStoreFileProtectionKey` — data accessible when device locked
- Logging sensitive data via `print()`, `NSLog()`, `os_log()` (persists in device logs)
- Clipboard (`UIPasteboard.general`) storing passwords/tokens — accessible by other apps

**Network & Transport:**
- `allowsArbitraryLoads = true` in `Info.plist` App Transport Security — disables TLS enforcement
- Custom `URLSessionDelegate` with `urlSession(_:didReceive:completionHandler:)` accepting all certificates
- `NSExceptionDomains` with `NSExceptionAllowsInsecureHTTPLoads` — per-domain TLS bypass
- Missing certificate pinning for sensitive API connections

**Injection & Code Execution:**
- `WKWebView` with `javaScriptEnabled` loading untrusted content
- `WKWebView.evaluateJavaScript()` with user-controlled strings
- `UIWebView` usage (deprecated, no process isolation — use `WKWebView`)
- Deep link handlers (`application(_:open:options:)`) without URL validation
- Universal Links without proper `apple-app-site-association` validation
- Custom URL schemes accepting commands without authentication

**Crypto & Auth:**
- `CommonCrypto` with `kCCAlgorithmDES`, `kCCAlgorithm3DES` — weak ciphers
- `CC_MD5()`, `CC_SHA1()` for security purposes
- ECB mode: `kCCOptionECBMode`
- Hardcoded encryption keys in Swift source
- `SecRandomCopyBytes` not checked for return status
- Missing biometric authentication fallback policy (`LAPolicy` allowing passcode)
- Keychain items without `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`

**Memory & Runtime:**
- Sensitive data in `String` (immutable, can't be zeroed) — use `Data` or `[UInt8]` and zero after use
- Screenshots containing sensitive data (implement `applicationWillResignActive` blur)
- Background snapshot caching in app switcher
- Jailbreak detection bypass (check for Cydia, write outside sandbox, fork())
- `UnsafeMutablePointer` / `UnsafeBufferPointer` without bounds validation

**SwiftUI / UIKit Specific:**
- `Text` rendering HTML content without sanitization
- Custom paste handlers accepting unexpected content types
- `SFSafariViewController` vs `ASWebAuthenticationSession` for OAuth (latter prevents token interception)

## Threat Scan Patterns

**Suspicious Patterns:**
- `dlopen()` / `dlsym()` — dynamic library loading at runtime
- `ProcessInfo.processInfo.environment` — bulk environment harvesting
- `FileManager.default.contentsOfDirectory(at:)` scanning sensitive directories
- `CNContactStore` / `PHPhotoLibrary` access without clear UI justification
- `CLLocationManager` with `requestAlwaysAuthorization` when `whenInUse` suffices
- `MFMessageComposeViewController` / `MFMailComposeViewController` pre-populating with computed data
- Keychain access patterns reading items the app didn't write
- `IOKit` direct hardware access
