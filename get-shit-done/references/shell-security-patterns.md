# Shell Security Patterns Reference

## Threat Scan Patterns

> These patterns detect *deliberately malicious code*. Source: SEED-008.
> Note: semgrep Shell support is limited. Grep patterns are the primary detection mechanism.

### Obfuscation Fingerprints

#### Grep-Based Detection
```bash
# eval + base64 decode
grep -rn "eval.*base64 -d" . --include="*.sh"
```

#### Semgrep Rules
- `thr-obfuscation-iex-encoded-ps` (generic) — base64+eval pattern

### Reverse Shells

#### Grep-Based Detection
```bash
# bash /dev/tcp reverse shell
grep -rn "/dev/tcp/" . --include="*.sh"
# netcat reverse shell
grep -rn "nc -e" . --include="*.sh"
# mkfifo reverse shell
grep -rn "mkfifo" . --include="*.sh"
```

### Supply Chain Hooks

#### Grep-Based Detection
```bash
# Remote download + execute
grep -rn "curl.*| bash|wget.*| sh" . --include="*.sh"
# Cron persistence
grep -rn "crontab|cron.d" . --include="*.sh"
```

### Credential Exfiltration

#### Grep-Based Detection
```bash
# Credential file access + network
grep -rn ".ssh/id_|.aws/credentials" . --include="*.sh" | grep "cat|curl|wget"
```

### Logic Bombs

#### Grep-Based Detection
```bash
# Date-based conditional
grep -rn "date +%" . --include="*.sh" | grep -E "if|while"
# Destructive ops
grep -rn "rm -rf|shred" . --include="*.sh" | grep -v "^#"
```