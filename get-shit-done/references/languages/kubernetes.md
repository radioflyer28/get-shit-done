# Kubernetes / Helm — Security Checks

## Code Vulnerabilities (OWASP)

**Pod Security:**
- `securityContext.privileged: true` — full host access, equivalent to root on host
- `securityContext.runAsUser: 0` — running as root
- Missing `runAsNonRoot: true` — defaults to root
- Missing `readOnlyRootFilesystem: true` — writable container filesystem
- Missing `allowPrivilegeEscalation: false` — setuid binaries can escalate
- `capabilities.add: [SYS_ADMIN, NET_ADMIN, SYS_PTRACE, NET_RAW]` — dangerous Linux capabilities
- Missing `capabilities.drop: [ALL]` — containers keep default capabilities
- `hostPID: true` — pod sees host processes → process injection, credential harvesting
- `hostNetwork: true` — pod uses host network namespace → sniff host traffic, bind to host ports
- `hostIPC: true` — shared IPC namespace → shared memory attacks
- `hostPath` volumes mounting sensitive host directories

**Secrets Management:**
- `kind: Secret` with `data:` in plaintext YAML committed to git (base64 is encoding, NOT encryption)
- `stringData:` in Secret manifests — plaintext, even more obvious
- Secrets mounted as environment variables: `envFrom: secretRef:` — visible in `/proc/*/environ`
- Secrets mounted as files without restrictive `defaultMode` — world-readable by default (mode 0644)
- `imagePullSecrets` with credentials in source control
- Missing external secret management (Vault, AWS Secrets Manager, sealed-secrets)
- `kubectl create secret` commands in CI/CD scripts with plaintext values
- Secret values in Helm `values.yaml` committed to git

**RBAC:**
- `kind: ClusterRole` with `verbs: ["*"]` and `resources: ["*"]` — cluster admin
- `ClusterRoleBinding` binding to `system:anonymous` or `system:unauthenticated` — public cluster access
- ServiceAccount with cluster-admin role — lateral movement
- `automountServiceAccountToken: true` (default) — every pod gets API access token
- Missing `automountServiceAccountToken: false` on pods that don't need API access
- `RoleBinding` in one namespace binding to `ClusterRole` — escalation across namespaces
- Wildcard verbs: `verbs: ["*"]` instead of specific `["get", "list"]`
- `escalate`, `bind`, `impersonate` verbs — privilege escalation primitives

**Network Policies:**
- Missing `NetworkPolicy` — all pods can talk to all other pods by default
- `spec.ingress: [{}]` — allows all ingress (empty rule = allow all)
- `spec.egress: [{}]` — allows all egress
- Missing default-deny policy for namespace
- `namespaceSelector: {}` — selects all namespaces
- `podSelector: {}` — selects all pods in namespace
- Missing egress restriction to metadata API (`169.254.169.254`) — SSRF → cloud credentials
- Network policies not enforced: CNI plugin (e.g., Flannel) doesn't support them

**Resource Limits:**
- Missing `resources.limits.cpu` — pod can consume all node CPU
- Missing `resources.limits.memory` — pod can consume all node memory → OOMKill other pods
- Missing `resources.requests` — scheduler can't make informed placement decisions
- `resources.limits.ephemeral-storage` missing — disk fill DoS
- Missing `LimitRange` for namespace — no default limits for new pods
- Missing `ResourceQuota` for namespace — unbounded resource consumption

**Container Images:**
- `image: myapp:latest` — unpinned tag, silently changes
- Missing `imagePullPolicy: Always` with mutable tags — stale cached image
- No `imagePullPolicy` set — defaults vary by tag (`latest` = Always, others = IfNotPresent)
- Missing admission controller for image policy (e.g., only signed images)
- Images from untrusted registries without scanning

**Service & Ingress:**
- `type: LoadBalancer` — exposes service publicly
- `type: NodePort` — exposes on every node's IP
- `externalTrafficPolicy: Local` vs `Cluster` — impacts source IP preservation
- Ingress without TLS: missing `tls:` section → plaintext traffic
- Ingress with wildcard host: `host: "*.example.com"` — overly broad
- Missing `nginx.ingress.kubernetes.io/auth-url` on sensitive paths
- `nginx.ingress.kubernetes.io/configuration-snippet` — Lua/config injection risk
- Missing rate limiting annotations on public endpoints

**Helm-Specific:**
- `{{ .Values.password }}` rendered into manifests — plaintext in release secrets
- `{{ tpl .Values.userInput . }}` — template injection if user controls values
- Missing `required` function: `{{ required "password required" .Values.password }}` — deploy without secrets
- `--set password=secret` on Helm CLI — visible in shell history, process list
- `helm repo add` from HTTP URLs — MITM on chart download
- Chart dependencies from untrusted repositories
- Hooks (`pre-install`, `post-install`) running arbitrary scripts
- Missing `securityContext` in default `values.yaml` — insecure defaults for users

**Pod Disruption & Scheduling:**
- Missing `PodDisruptionBudget` — workload can be fully drained
- `tolerations` for all taints — pod can schedule on master/control-plane nodes
- `nodeSelector` / `affinity` missing — pods may land on unintended nodes
- `priorityClassName: system-node-critical` — pod can preempt critical system pods

## Threat Scan Patterns

**Suspicious K8s manifests:**
- `hostPath` mounting `/`, `/etc`, `/var/run/docker.sock`, `/root/.ssh`
- Pods with `privileged: true` + `hostNetwork: true` — host escape setup
- ServiceAccount tokens mounted in pods with broad RBAC — lateral movement
- CronJobs running `kubectl` commands or `curl` to external endpoints
- Init containers downloading binaries from external URLs at pod startup
- `lifecycle.postStart` hooks executing arbitrary commands
- Sidecar containers that proxy or exfiltrate traffic
- DaemonSets deploying agents to every node
- `configMap` containing encoded scripts or suspicious commands
- Admission webhooks (`MutatingAdmissionWebhook`) modifying pod specs — backdoor injection
- `PersistentVolumeClaim` mounting other namespaces' storage
