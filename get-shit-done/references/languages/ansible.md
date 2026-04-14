# Ansible — Security Checks

## Code Vulnerabilities (OWASP)

**Secrets & Credentials:**
- Plaintext passwords in playbooks: `ansible_ssh_pass: "password123"`
- Plaintext in inventory: `[webservers]\nhost1 ansible_password=secret`
- Variables in `group_vars/` or `host_vars/` with secrets not encrypted by Vault
- Missing `ansible-vault encrypt` on files containing secrets
- `ansible-vault` password stored in plaintext file referenced by `--vault-password-file`
- Vault password in CI/CD environment variables logged to build output
- `debug: msg="{{ db_password }}"` — secrets printed to console/logs
- `register: result` followed by `debug: var=result` — may contain secrets in stdout/stderr
- `no_log: true` missing on tasks handling secrets — task output logged with sensitive data
- `.vault_pass` file committed to git
- `lookup('env', 'SECRET')` — environment variable may be logged

**Command Injection:**
- `command: "{{ user_input }}"` — arbitrary command execution
- `shell: "echo {{ user_input }}"` — shell injection (shell module uses `/bin/sh`)
- `raw: "{{ user_input }}"` — raw command on remote host
- `script: "{{ user_script }}"` — execute user-controlled script
- `command` module is safer than `shell` (no shell expansion) but still vulnerable to argument injection
- `args: chdir: "{{ user_path }}"` — directory traversal before command execution
- Jinja2 template injection in variables: `{{ lookup('pipe', user_input) }}`
- `when: "{{ user_condition }}"` — Jinja2 evaluation of user-controlled condition (already quoted = double-eval)

**Template & Jinja2 Risks:**
- `template: src={{ user_template }}` — arbitrary template rendering
- Templates with `{{ lookup('pipe', 'command') }}` — command execution via template
- `{% raw %}{% endraw %}` blocks hiding template injection
- Template files not in `templates/` directory — unexpected template rendering
- `ansible_managed` comment missing — hard to identify managed files
- `unsafe` prefix: `!unsafe "{{ not_a_template }}"` — prevents evaluation but if missing, user data is evaluated

**Privilege Escalation:**
- `become: true` with `become_method: sudo` and `become_user: root` — runs as root
- `become: true` at playbook level — ALL tasks run as root, including those that don't need it
- Missing `become: false` on tasks that should run unprivileged
- `become_user: "{{ user_input }}"` — escalate to attacker-chosen user
- NOPASSWD sudo entries created by Ansible — permanent privilege escalation
- `ansible_become_pass` in variables — sudo password exposed

**File Operations:**
- `copy: content="{{ user_data }}" dest=/etc/crontab` — arbitrary file write to sensitive location
- `file: path=/etc/shadow mode=0666` — world-readable sensitive file
- `lineinfile: path={{ user_path }} line={{ user_data }}` — arbitrary write
- `template: dest={{ user_path }}` — template render to attacker-chosen path
- `fetch: src={{ user_path }}` — arbitrary file read from remote hosts
- `unarchive: src={{ user_url }} remote_src=yes` — download and extract from arbitrary URL
- `get_url: url={{ user_url }}` — SSRF, arbitrary file download
- `synchronize` with `delete: yes` — can delete files on remote

**Inventory & Targeting:**
- Dynamic inventory scripts executing external code
- `--limit "{{ user_input }}"` — injection into host patterns
- `add_host: name={{ user_input }}` — SSRF via dynamic inventory
- `delegate_to: "{{ user_host }}"` — run task on attacker-controlled host
- `local_action` — runs on Ansible controller, not target → controller compromise
- `connection: local` — same risk, running on controller

**Role & Collection Security:**
- `ansible-galaxy install` from untrusted Galaxy or git repos — supply chain
- Roles without `meta/` — unclear dependencies and platform support
- `requirements.yml` with git sources without version pinning
- Custom modules in `library/` — Python code execution on controller/targets
- Custom `filter_plugins/` — Jinja2 filters executing arbitrary Python
- `callback_plugins/` — executed for every task, can exfiltrate data
- `action_plugins/` — modify task execution, can inject behavior

**Configuration (ansible.cfg):**
- `host_key_checking = False` — MITM vulnerability; SSH keys not verified
- `remote_tmp` set to world-writable directory
- `log_path` pointing to world-readable location — credential exposure
- `retry_files_enabled = True` and `retry_files_save_path` — failed host lists stored
- `forks` set very high without connection limits — DoS on targets

## Threat Scan Patterns

**Suspicious Ansible patterns:**
- Playbooks with `delegate_to: localhost` running `curl` or network commands — data exfiltration from controller
- Roles that modify SSH `authorized_keys` — backdoor access
- Tasks adding crontab entries or systemd services — persistence
- `uri` module POSTing collected data to external endpoints
- Tasks that disable SELinux, firewall, or audit logging
- `command`/`shell` tasks running base64-decoded content
- Callback plugins sending play data to external URLs
- Dynamic inventory scripts that phone home before returning host lists
- Tasks modifying `/etc/sudoers` — privilege escalation persistence
- Roles downloading binaries from non-official sources
