# Angular — Security Checks

> Parent: `javascript-typescript.md` — always load parent first.

## Framework-Specific Vulnerabilities

**XSS & Template Injection:**
- `[innerHTML]="userInput"` — Angular sanitizes this by default, BUT:
- `bypassSecurityTrustHtml(userInput)` — explicitly bypasses sanitizer → XSS
- `bypassSecurityTrustStyle()` — CSS injection
- `bypassSecurityTrustScript()` — script injection
- `bypassSecurityTrustUrl()` — URL injection (`javascript:` protocol)
- `bypassSecurityTrustResourceUrl()` — resource URL injection (iframe src, object data)
- `DomSanitizer.sanitize()` with `SecurityContext.NONE` — disables sanitization
- Server-side template injection: `renderModuleFactory` with user-controlled templates (Angular Universal)
- `ElementRef.nativeElement.innerHTML = userInput` — direct DOM access bypasses Angular's sanitizer
- `Renderer2.setProperty(el, 'innerHTML', userInput)` — same direct DOM bypass

**HTTP & API Security:**
- `HttpClient` without interceptor for auth headers — inconsistent auth
- Missing `HttpInterceptor` for error handling — raw error messages to UI
- `HttpClient.jsonp()` — JSONP is inherently vulnerable; avoid if possible
- XSRF: Angular includes XSRF protection via `HttpClientXsrfModule`, but must configure cookie/header names
- Missing `withCredentials: true` on cross-origin authenticated requests
- `HttpParams` with user input — ensure proper encoding

**Authentication & Guards:**
- `CanActivate` / `CanLoad` guards — client-side only, server must re-validate
- `canActivate` returning `true` without async auth check — race condition
- Guards checking `localStorage` token without verifying expiration or signature
- `APP_INITIALIZER` loading auth config — if it fails, app may render unauthenticated view
- `@angular/fire` (Firebase) — security rules must be on server, not just client guards

**Routing:**
- `router.navigateByUrl(userInput)` — open redirect if accepting external URLs
- `router.navigate([userControlledSegment])` — path manipulation
- Wildcard routes (`**`) without proper 404 — can catch sensitive paths
- `RouteReuseStrategy` caching authenticated views — shown to unauthenticated users on back-navigation
- `loadChildren` dynamic imports — route structure exposed in network tab

**Server-Side Rendering (Angular Universal):**
- `TransferState` serialized to HTML — check for sensitive data in `<script id="serverApp-state">`
- `renderModule` with unsafe data in state transfer
- `REQUEST` / `RESPONSE` injection tokens — server request/response objects; don't leak to client
- Platform-server rendering user input without sanitization
- Express server (`server.ts`) missing security headers, rate limiting

**Dependency Injection:**
- `@Injectable({ providedIn: 'root' })` singletons — shared state across components; if storing auth state, ensure proper isolation
- `useFactory` providers using `window` — SSR breaks (no `window` on server), may skip security logic
- `InjectionToken` with user-controlled values — ensure validation

**Forms:**
- `ngModel` two-way binding on hidden fields — user can modify via devtools
- Reactive forms without server-side re-validation
- `FormControl.setValue(userInput)` without validators — bypasses template validators
- File upload via `FormData` without size/type validation

**Configuration:**
- `environment.ts` / `environment.prod.ts` — compiled into client bundle, never put secrets here
- `angular.json` with `sourceMap: true` in production — exposes source code
- `outputHashing: 'none'` — cache poisoning (no cache busting)
- Missing CSP configuration — Angular requires `unsafe-inline` for styles by default; use `nonce`
- `NG_BUILD_MANGLE=false` — preserves function/class names (information disclosure)
