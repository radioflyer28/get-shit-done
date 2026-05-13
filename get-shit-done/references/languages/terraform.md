# Terraform / OpenTofu (HCL) — Security Checks

## Code Vulnerabilities (OWASP)

**Secrets & Credentials:**
- `password = "P@ssw0rd"` hardcoded in `.tf` files
- `access_key` / `secret_key` in provider blocks — AWS credentials in source
- `default = "secret"` in `variable` blocks — secrets as defaults
- `terraform.tfvars` or `*.auto.tfvars` with secrets committed to git
- `terraform.tfstate` contains ALL resource attributes in plaintext — state file with secrets
- Remote state without encryption: `backend "s3" { encrypt = false }`
- Missing `.gitignore` entries for `*.tfstate`, `*.tfstate.backup`, `*.tfvars`
- `output` blocks exposing sensitive values without `sensitive = true`
- `local_file` resource writing secrets to disk
- `data.external` passing secrets via environment to external scripts

**AWS Resource Misconfigurations:**
- `aws_security_group` ingress `cidr_blocks = ["0.0.0.0/0"]` on port 22/3389 — public SSH/RDP
- `aws_s3_bucket` without `aws_s3_bucket_public_access_block` — public buckets
- `aws_s3_bucket_acl` with `"public-read"` or `"public-read-write"`
- `aws_s3_bucket` without `server_side_encryption_configuration` — unencrypted at rest
- `aws_s3_bucket` without `versioning { enabled = true }` — no rollback on deletion/modification
- `aws_db_instance` with `publicly_accessible = true` — public database
- `aws_db_instance` without `storage_encrypted = true` — unencrypted database
- `aws_db_instance` with `backup_retention_period = 0` — no backups
- `aws_iam_policy` with `"Action": "*"` and `"Resource": "*"` — admin access
- `aws_iam_role` with `assume_role_policy` allowing `"Principal": "*"` — public assume
- `aws_lambda_function` without `vpc_config` when accessing VPC resources
- `aws_cloudwatch_log_group` without `retention_in_days` — unbounded log storage costs
- `aws_kms_key` without key rotation: `enable_key_rotation = false`
- `aws_ebs_volume` without `encrypted = true`
- `aws_elasticsearch_domain` without `encrypt_at_rest`, `node_to_node_encryption`
- `aws_ecs_task_definition` with `privileged = true` or `user = "root"`

**Azure Resource Misconfigurations:**
- `azurerm_network_security_rule` allowing `0.0.0.0/0` on management ports
- `azurerm_storage_account` with `allow_blob_public_access = true`
- `azurerm_storage_account` without `min_tls_version = "TLS1_2"`
- `azurerm_key_vault` without `purge_protection_enabled = true`
- `azurerm_sql_server` without `azuread_administrator` — SQL auth only
- `azurerm_kubernetes_cluster` without `role_based_access_control_enabled`

**GCP Resource Misconfigurations:**
- `google_compute_firewall` allowing `0.0.0.0/0` source ranges on SSH
- `google_storage_bucket` with public IAM bindings (`allUsers`, `allAuthenticatedUsers`)
- `google_project_iam_binding` with `roles/owner` to broad principals
- `google_sql_database_instance` with `ipv4_enabled = true` + authorized `0.0.0.0/0`
- `google_compute_instance` with `metadata.enable-oslogin = false`

**Provider & Backend Security:**
- Provider blocks without version constraints: `source = "hashicorp/aws"` but no `version = "~> 5.0"`
- Third-party providers without GPG key verification
- `backend "http"` without TLS — state sent over plaintext
- `backend "s3"` without `dynamodb_table` — no state locking, race conditions
- `backend "local"` in team environments — state not shared, conflicts
- Cross-account access without explicit trust boundaries
- `terraform init` from untrusted `.terraform/` directories — provider binary replacement

**Module Security:**
- `module "foo" { source = "git::https://github.com/unknown/module" }` — untrusted module
- Module source without version pin: `source = "hashicorp/module"` vs `version = "3.2.1"`
- `source = "./modules/local"` — local modules not reviewed
- Registry modules vs git modules — registry has some vetting, direct git does not
- Module outputs exposing sensitive data without `sensitive = true`
- Nested module calls hiding destructive resources

**Provisioners (Anti-Pattern):**
- `provisioner "local-exec" { command = "curl ... | bash" }` — remote code execution
- `provisioner "remote-exec"` — SSH into instances, executing arbitrary commands
- `provisioner "file"` — copying potentially sensitive content
- Provisioners run on `terraform apply` — may execute on plan reviewer's machine
- `null_resource` with provisioners — arbitrary code execution trigger

**State Management:**
- `terraform state pull` exposes all secrets in state
- `terraform import` can import resources with sensitive attributes
- State file stored in shared S3 without versioning — silent overwrite
- `terraform force-unlock` without investigation — race condition resolution
- `moved` blocks can redirect resource identity — potentially destructive

## Threat Scan Patterns

**Suspicious Terraform patterns:**
- `data "external"` calling scripts that download/execute remote code
- `data "http"` fetching content from suspicious URLs
- `null_resource` with `local-exec` running encoded/obfuscated commands
- Provider blocks with custom `endpoints` overrides → traffic hijacking
- Modules sourced from personal GitHub repos (not registry or org-controlled)
- `terraform_remote_state` referencing cross-account state — lateral access
- Backend configuration pointing to unexpected regions/accounts
- Resources in unexpected regions (data residency evasion)
- IAM resources creating broad permissions or unusual trust relationships
- `lifecycle { prevent_destroy = false }` on critical infrastructure — deletion enabled
