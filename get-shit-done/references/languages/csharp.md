# C# / .NET — Security Checks

## Code Vulnerabilities (OWASP)

**Injection & Code Execution:**
- String concatenation in SQL: `$"SELECT * FROM Users WHERE Id={id}"` — use `SqlParameter` or Dapper parameterized queries
- `Process.Start()` with user-controlled arguments
- `Assembly.Load()` / `Assembly.LoadFrom()` with user-controlled paths — arbitrary assembly loading
- `CSharpCodeProvider.CompileAssemblyFromSource()` — dynamic compilation of user input
- `System.Xml.XmlDocument.Load()` without disabling DTD processing (XXE)
- `XmlReader` without `DtdProcessing.Prohibit`
- LINQ injection via `Dynamic LINQ` library with user-controlled expressions
- Razor `@Html.Raw(userInput)` — XSS; use `@Html.Encode()` or default `@` encoding

**Deserialization:**
- `BinaryFormatter.Deserialize()` — arbitrary code execution (deprecated, never use with untrusted data)
- `SoapFormatter`, `NetDataContractSerializer`, `LosFormatter` — same risk as BinaryFormatter
- `JavaScriptSerializer` with `TypeResolver` — type confusion RCE
- `Newtonsoft.Json` with `TypeNameHandling` != `None` — deserialization gadgets
- `System.Text.Json` with polymorphic serialization without discriminator validation
- `XmlSerializer` with user-controlled type parameter

**Path Traversal & File I/O:**
- `Path.Combine(basePath, userInput)` — if `userInput` is absolute, base is ignored
- `File.ReadAllText(userInput)` without path validation
- `ZipFile.ExtractToDirectory()` without entry path validation (Zip Slip)
- `FileStream` without canonicalization check (`Path.GetFullPath` + prefix validation)

**Authentication & Crypto:**
- `new Random()` for tokens — use `RandomNumberGenerator.GetBytes()`
- `MD5.Create()`, `SHA1.Create()` for passwords — use `Rfc2898DeriveBytes` (PBKDF2), `BCrypt`, or Argon2
- `Aes.Create()` without explicit `Mode` (defaults may vary) — set `CipherMode.CBC` + unique IV or use `CipherMode.GCM`
- `DES`, `TripleDES`, `RC2` — weak ciphers
- `ServicePointManager.ServerCertificateValidationCallback = (s, c, ch, e) => true` — disables all TLS validation
- `HttpClientHandler.ServerCertificateCustomValidationCallback` returning `true`
- Hardcoded connection strings with passwords in `appsettings.json`

**ASP.NET Specific:**
- Missing `[Authorize]` attribute on controllers/actions
- `[AllowAnonymous]` on sensitive endpoints
- CSRF: missing `[ValidateAntiForgeryToken]` on POST actions
- `CORS` policy with `AllowAnyOrigin()` + `AllowCredentials()` — credential theft
- `app.UseDeveloperExceptionPage()` in production — stack trace disclosure
- ViewState without MAC validation (`enableViewStateMac="false"`)
- Missing `Content-Security-Policy` header
- `Session` storing sensitive data without encryption
- `TempData` with cookie-based provider storing secrets

**Entity Framework:**
- `FromSqlRaw()` with string interpolation — SQL injection; use `FromSqlInterpolated()` or `FromSql()`
- `.Include()` chains without depth limits — DoS via deep object graphs
- Sensitive data in migration snapshots

**Blazor:**
- `MarkupString` with user input — XSS
- JavaScript interop (`IJSRuntime.InvokeAsync`) with user-controlled function names
- Component parameters accepting raw HTML

## Threat Scan Patterns

**Suspicious Patterns:**
- `System.Reflection` for accessing private members or invoking arbitrary methods
- `System.Runtime.InteropServices` (P/Invoke) calling native APIs
- `System.Management` (WMI) — system management/recon
- `Microsoft.Win32.Registry` — registry manipulation
- `System.Diagnostics.Process` in libraries that shouldn't spawn processes
- `System.Net.Sockets.Socket` raw connections in non-networking code
- `ILGenerator` / `DynamicMethod` — runtime IL generation
- `AppDomain.CreateDomain()` / `AssemblyLoadContext` for isolation bypass
- `System.Security.Principal.WindowsIdentity` impersonation
- `#if DEBUG` blocks with security-relevant logic that differs in release
