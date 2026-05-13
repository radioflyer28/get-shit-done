# cloud-init — Security Checks

## Code Vulnerabilities (OWASP)

**Script Execution:**
- `runcmd:` block runs arbitrary commands as root on first boot
- `bootcmd:` runs before networking is up — earlier than `runcmd`, also as root
- `write_files:` + `runcmd:` pattern: write script then execute — review both together
- `runcmd: ["curl https://example.com/setup.sh | bash"]` — remote script execution as root
- `snap:` commands with `--devmode` or `--dangerous` — bypass snap confinement
- `apt:` / `yum:` / `zypper:` installing packages from unchecked repositories

**Secrets & Credentials:**
- `password: plaintextpassword` in `users:` block — user password in config
- `ssh_authorized_keys:` with unexpected public keys — backdoor SSH access
- `chpasswd: list: |` with plaintext passwords
- `write_files:` creating files with credentials (API keys, database passwords, tokens)
- `ca_certs:` injecting custom CA certificates — MITM capability
- Connection strings, tokens in `runcmd:` commands — visible in cloud-init logs
- `phone_home:` sending data to external URL — may include instance metadata

**User & Access Management:**
- `users:` with `sudo: ALL=(ALL) NOPASSWD:ALL` — passwordless root
- `users:` with `groups: [sudo, docker, wheel]` — broad privilege
- `lock_passwd: false` with weak password — password login enabled
- `ssh_import_id:` importing SSH keys from GitHub/Launchpad — dynamic key source
- `disable_root: false` — root login enabled
- Missing `expire: true` on initial passwords — default password remains valid
- `no_ssh_fingerprints: true` — suppresses host key display → harder to verify

**File Operations:**
- `write_files:` with `permissions: '0777'` — world-writable files
- `write_files:` to `/etc/sudoers`, `/etc/crontab`, `/etc/ssh/sshd_config` — system modification
- `write_files:` with `path: /root/.ssh/authorized_keys` — root SSH key injection
- `write_files:` with `encoding: b64` — base64 content potentially hiding malicious payloads
- `write_files:` targeting systemd unit files — persistence via services
- Missing `owner`/`permissions` on `write_files` — defaults to root:root 0644 but sensitive files may need stricter

**Network Configuration:**
- `network:` config disabling firewall rules
- DNS overrides pointing to untrusted resolvers
- `manage_resolv_conf: true` with custom nameservers — DNS hijacking
- Static routes to unexpected networks
- `manage_etc_hosts: true` with custom entries — hostname resolution manipulation

**Package & Repository Management:**
- `apt_sources:` or `yum_repos:` adding untrusted repositories
- `package_update: true` + `package_upgrade: true` without pinned versions — unpredictable changes
- PPA additions: `apt: source: "ppa:untrusted/repo"`
- GPG key import from URLs: `key: https://example.com/key.gpg` — supply chain
- `snap:` installing snaps from non-official stores

**Metadata & Instance Context:**
- `datasource:` configuration can be manipulated if metadata service is accessible
- `instance-id` manipulation — cloud-init re-runs if ID changes
- IMDS (Instance Metadata Service) accessible from `runcmd` — `curl http://169.254.169.254/latest/meta-data/` → cloud credentials
- User data not encrypted — visible to anyone with instance access
- `/var/log/cloud-init.log` and `/var/log/cloud-init-output.log` contain all executed commands and their output — secret leakage

**Multi-Part & Include:**
- `#include https://example.com/config` — remote config inclusion at provision time
- `#include-once` — same risk, cached but still remote fetch
- Multi-part MIME user data — separate sections for different cloud-init modules, each section executed
- `merge_how` directives changing config merge behavior — can override security settings

## Threat Scan Patterns

**Suspicious cloud-init patterns:**
- `runcmd` downloading and executing remote scripts as root
- `write_files` creating scripts in `/usr/local/bin/` or `/etc/cron.d/` — persistence
- `users` section adding unknown SSH keys or creating backdoor accounts
- `ca_certs` injecting custom CA certificates for MITM
- `phone_home` sending instance metadata to external endpoints
- `#include` loading configuration from non-organizational URLs
- `bootcmd` modifying system before security tools are loaded
- `write_files` targeting `/etc/ssh/sshd_config` to enable PasswordAuthentication or PermitRootLogin
- `runcmd` disabling unattended-upgrades, SELinux, or firewall
- Base64-encoded `write_files` content that decodes to shell scripts or binaries
