# Quarantine Workflow

> **Purpose:** Formalize the quarantine protocol for files confirmed malicious or highly suspicious
> during a `/gsd-threat-scan` run. Quarantine is metadata-only — no malicious content is ever
> committed to git history.

## Overview

The quarantine protocol has three stages:

1. **QUARANTINE** — threat-scan detects COMPROMISED verdict, creates `.quarantine/<file>.threat.md`
2. **REVIEW** — second reviewer audits findings and decides: confirm threat or false positive
3. **RELEASE or REMEDIATE** — file is cleared (false positive) or removed/remediated (confirmed threat)

## Triggering Quarantine

Quarantine is invoked automatically when:
- `/gsd-threat-scan --quarantine` is run AND
- The scan verdict is `COMPROMISED`

```bash
# Trigger quarantine workflow
/gsd-threat-scan /path/to/repo --quarantine
```

## Quarantine File Format

Each quarantined file produces `.quarantine/<filename>.threat.md`:

```markdown
# Quarantine Report: <filename>

**Status:** QUARANTINED
**Date:** <ISO8601>
**Scan ID:** <git-short>-<epoch>
**Verdict:** COMPROMISED

## Affected File

- **Path:** <relative path>
- **SHA256:** <sha256 hash>
- **Size:** <bytes>

## Findings Summary

<agent-generated bullet points — 3–5 findings>

## Release Procedure

To release this file from quarantine:
1. Review findings with a second reviewer
2. Confirm each finding is a false positive or has been remediated
3. Run: `rm .quarantine/<filename>.threat.md`
4. Document rationale in git commit message: `quarantine: release <filename> — <reason>`
5. If the file was removed from the repo, restore it only after confirmation
```

## Release Procedure (False Positive)

When a quarantined file is confirmed to be a false positive:

```bash
# 1. Review the threat report
cat .quarantine/<filename>.threat.md

# 2. Verify the findings manually (do NOT execute the file)
grep -n "eval\|exec\|base64" <path/to/file>

# 3. Get a second reviewer sign-off (required)
# Document their username and review date

# 4. Remove the quarantine marker
rm .quarantine/<filename>.threat.md

# 5. Commit with documented rationale
git add .quarantine/
git commit -m "quarantine: release <filename> — false positive, <reason>

Reviewed by: <reviewer>
Finding: <what was flagged>
Rationale: <why it is safe>
"
```

## Remediation Procedure (Confirmed Threat)

When a quarantined file contains a confirmed malicious pattern:

```bash
# 1. Document the threat
cat .quarantine/<filename>.threat.md

# 2. Remove the malicious file from the working tree
rm <path/to/file>

# 3. If the file was already committed, purge from git history
# WARNING: This rewrites history — coordinate with your team first
git filter-repo --invert-paths --path <path/to/file>
# Or use BFG Repo Cleaner: https://rtyley.github.io/bfg-repo-cleaner/

# 4. Commit the removal
git add -A
git commit -m "security: remove malicious file <filename>

Threat confirmed by: <reviewer>
Scan ID: <scan_id from .threat.md>
Findings: <summary>
"

# 5. Keep the .threat.md as audit trail
git add .quarantine/<filename>.threat.md
git commit -m "quarantine: retain audit trail for <filename>"

# 6. Rotate any credentials that may have been accessed
# 7. Notify your security team
```

## .gitignore Recommendations

Quarantine metadata files should be committed (they are audit trail):

```gitignore
# Do NOT ignore .quarantine/ — it is audit trail
# .quarantine/  ← don't add this

# Do ignore temporary analysis artifacts
.gsd-scan-state.json.tmp
```

## CI Integration

In CI, threat scan runs in non-interactive mode with `--ci`:

```bash
# .github/workflows/security.yml example
- name: Threat Scan
  run: |
    /gsd-threat-scan . --ci --quarantine
  # Exit code: 0 = clean/skipped, 1 = threats found, 2 = scan error

- name: Upload quarantine artifacts
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: quarantine-reports
    path: .quarantine/
```

## Audit Trail

All quarantine events are tracked in:
- `.quarantine/<filename>.threat.md` — per-file metadata
- Git history — commit messages document all quarantine, review, and release events
- `CI_RESULTS.json` — CI run verdict and finding counts

## Security Guarantees

- **No execution** — threat-scan never executes scanned files
- **No content in git** — only hashes, paths, and descriptions are committed
- **Audit trail** — quarantine reports are retained even after release/remediation
- **Second reviewer** — release requires documented second reviewer approval
