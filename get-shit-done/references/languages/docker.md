# Docker / Containerfiles — Security Checks

## Code Vulnerabilities (OWASP)

**Base Image Risks:**
- `FROM ubuntu:latest` / `FROM python:3` — unpinned tags, silently change content
- `FROM alpine` without version — same issue
- Use digest pinning: `FROM python:3.11-slim@sha256:abc123...` for reproducibility
- `FROM scratch` is safest but impractical for most apps — prefer `-slim` or `-alpine` variants
- Third-party base images from Docker Hub without verification — supply chain risk
- Multi-arch images may have different vulnerability profiles per platform

**Privilege Escalation:**
- Missing `USER nonroot` — container runs as root by default
- `USER root` after `USER nonroot` later in Dockerfile — re-escalates
- `RUN chmod u+s /bin/bash` — setuid on bash → root escape
- `--privileged` in docker-compose or run commands — full host access
- `cap_add: [SYS_ADMIN, NET_ADMIN, SYS_PTRACE]` — dangerous capabilities
- Missing `no-new-privileges:true` security option
- `--pid=host` — container sees host processes
- `--network=host` — container shares host network stack
- `--userns=host` — disables user namespace isolation

**Secrets in Images:**
- `ENV API_KEY=sk-abc123` — secret baked into image layer, visible via `docker history`
- `ARG SECRET` + `RUN curl -H "Authorization: $SECRET"` — ARG values in build cache/layers
- `COPY .env .` — environment file with secrets copied into image
- `COPY . .` without `.dockerignore` — pulls in `.env`, `.git/`, credentials, private keys
- `RUN --mount=type=secret,id=mysecret` — correct approach (BuildKit secrets)
- `COPY id_rsa /root/.ssh/` — SSH keys in image
- Multi-stage build: secrets in early stage still in image layers unless squashed
- `docker build --build-arg PASSWORD=secret` — visible in `docker history`

**Network & Exposure:**
- `EXPOSE 0.0.0.0:port` vs `EXPOSE 127.0.0.1:port` — binding to all interfaces
- `-p 3306:3306` — exposing database port to host network
- Missing network isolation between containers — default bridge network allows inter-container communication
- `links:` (deprecated) without network policies
- DNS rebinding: containers resolving external DNS for internal service names

**Build & Layer Security:**
- `RUN apt-get update && apt-get install -y curl wget` without `--no-install-recommends` — bloated attack surface
- `RUN pip install -r requirements.txt` without pinned versions — non-reproducible
- `ADD https://example.com/file.tar.gz /app/` — downloads from URL at build time, no checksum verification
- `ADD` vs `COPY` — `ADD` auto-extracts archives and supports URLs, `COPY` is explicit and safer
- `RUN curl https://install.something.com | bash` — remote code execution during build
- Missing cleanup: `RUN apt-get update && apt-get install ... && rm -rf /var/lib/apt/lists/*`
- Layer caching: putting `COPY . .` before `RUN pip install` busts cache on every code change

**Runtime Configuration:**
- `docker run -v /:/host` — mounting host root filesystem
- `docker run -v /var/run/docker.sock:/var/run/docker.sock` — container controls Docker daemon → host escape
- `docker run -v /etc/shadow:/etc/shadow` — sensitive host file mount
- `read_only: true` missing in compose — container filesystem is writable
- Missing health checks: `HEALTHCHECK` directive absent → no restart on hang
- `restart: always` without resource limits — crash loop consuming resources
- Missing memory/CPU limits → DoS potential
- `tmpfs` not used for writable temp dirs → writes to overlay filesystem

**Docker Compose:**
- `privileged: true` in service definition
- `network_mode: host` — no network namespace isolation
- `pid: host` — host PID namespace
- `volumes: - /:/host:rw` — host filesystem mount
- Environment variables with secrets: `environment: - DB_PASSWORD=secret123`
- `.env` file with secrets committed to git
- `env_file: .env` loading secrets not in `.gitignore`
- Missing `deploy.resources.limits` — no resource constraints
- `depends_on` without `condition: service_healthy` — startup ordering without health verification

**Container Registry:**
- Pushing images with embedded secrets to public registries
- Missing image signing: no `DOCKER_CONTENT_TRUST=1`
- Using `http://` registry (insecure registry) — MITM
- Pulling from untrusted registries without image scanning

## Threat Scan Patterns

**Suspicious Dockerfile patterns:**
- `RUN curl/wget ... | bash` — downloading and executing remote scripts
- `ADD` from suspicious URLs — remote payload injection
- `COPY --from=` referencing external untrusted images
- `ENTRYPOINT` or `CMD` running encoded/obfuscated commands
- `HEALTHCHECK` running curl to external endpoints — heartbeat/beacon
- `ENV` or `ARG` with base64-encoded values that decode to URLs or commands
- `RUN` installing netcat, socat, nmap — offensive tooling in production image
- Multi-stage build where final stage copies suspicious binaries from builder
- `VOLUME` creating mount points at sensitive paths
- `ONBUILD` triggers — execute when image is used as base by others
