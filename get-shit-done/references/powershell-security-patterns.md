# PowerShell Security Patterns
# Language: PowerShell
# SEED-006, SEED-007, SEED-008

## Integration Notes

Loaded by: gsd-threat-scanner.md

## Threat Scan Patterns

> These patterns detect *deliberately malicious code*. Source: SEED-008.
> Note: semgrep PowerShell support is limited. Grep patterns are primary.
> Rule `thr-obfuscation-iex-encoded-ps` covers the main PS obfuscation.

### Obfuscation Fingerprints

#### Grep-Based Detection
```bash
# IEX + base64 encoded command
grep -rni "iex|invoke-expression" . --include="*.ps1" | grep -i "base64|frombase64|-enc"
# DownloadString + IEX dropper
grep -rni "downloadstring.*iex|iex.*downloadstring" . --include="*.ps1"
```

#### Semgrep Rules
- `thr-obfuscation-iex-encoded-ps` — IEX with base64 encoded command

### AMSI Bypass Patterns

#### Grep-Based Detection
```bash
# AMSI bypass via reflection
grep -rni "amsi|AmsiUtils|amsiInitFailed" . --include="*.ps1"
# Memory patching
grep -rni "VirtualProtect|WriteProcessMemory" . --include="*.ps1"
```

### Remote Download and Execution

#### Grep-Based Detection
```bash
# DownloadString dropper
grep -rni "DownloadString|DownloadFile|WebClient" . --include="*.ps1"
# Invoke-WebRequest + execute
grep -rni "iwr|Invoke-WebRequest" . --include="*.ps1" | grep -i "iex|invoke"
```

### Credential Harvesting

#### Grep-Based Detection
```bash
# DPAPI access
grep -rni "DPAPI|ProtectedData|Unprotect" . --include="*.ps1"
# LSASS access
grep -rni "lsass|sekurlsa|mimikatz" . --include="*.ps1"
# Credential files
grep -rni ".aws.credentials|.ssh.id_" . --include="*.ps1"
```

### Persistence Mechanisms

#### Grep-Based Detection
```bash
# Registry run keys
grep -rni "HKCU.*Run|HKLM.*Run" . --include="*.ps1"
# Scheduled tasks
grep -rni "New-ScheduledTask|Register-ScheduledTask" . --include="*.ps1"
# WMI persistence
grep -rni "WMI|ManagementEventWatcher" . --include="*.ps1"
```

### Logic Bombs

#### Grep-Based Detection
```bash
# Date-based trigger
grep -rni "DateTime.*Now|Get-Date" . --include="*.ps1" | grep -E "-gt |-lt "
# Environment-based trigger
grep -rni ".env:COMPUTERNAME|.env:USERNAME" . --include="*.ps1" | grep "if"
```