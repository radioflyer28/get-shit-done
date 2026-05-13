---
id: SEED-009
status: dormant
planted: 2026-04-14
planted_during: pre-project (no milestone yet)
trigger_when: when supply chain attacks or contributor-based threats become a focus, or when the threat scanner needs deeper git history analysis
scope: Medium
---

# SEED-009: Git Forensics Sub-Agent — Structured Deep-Dive into Commit History

## Why This Matters

The threat scanner currently performs git analysis inline — a few `git log`, `git reflog`,
`git branch --all` commands in `scan_deep_threats`. This surface-level coverage misses the
most sophisticated supply chain attack vectors:

- A malicious contributor adds a backdoor in commit A, then adds a "fix" in commit B that
  appears to remove it — but the exploit is triggered by the combination, not either commit alone
- Binary blobs exist in git's object database even after they're deleted from the working tree
- History rewrites (force-push) can replace legitimate commits with poisoned ones; reflog
  exposes the original but only briefly
- `.gitattributes` smudge/clean filters execute code on checkout — this is a known supply chain
  attack vector that grep-in-working-tree misses if the filter only activates on checkout
- Commit author consistency analysis: same email, different signing key; same name, different
  timezone; burst activity pattern (one-time contributor adds critical code then disappears)

A dedicated `gsd-git-forensics` sub-agent (or structured workflow step producing `GIT-FORENSICS.md`)
would make this analysis first-class, reproducible, and something the threat scan workflow
explicitly gates on for supply-chain focus mode.

## When to Surface

**Trigger:** When a milestone adds supply chain threat detection, when the threat scanner is
integrated into CI for dependency review, or when a high-profile supply chain attack raises the
bar for what GSD's threat scanner should catch.

This seed should be presented during `/gsd-new-milestone` when the milestone scope matches:
- Milestone improving supply chain attack detection in `gsd-threat-scanner`
- Milestone implementing SEED-006 or SEED-008 (natural moment to add forensics depth)
- Milestone adding CI-based threat scanning for PRs (needs git forensics to analyze what changed)
- Milestone following a real-world supply chain incident (xz utils, npm protestware, etc.)

## Scope Estimate

**Medium** — One focused phase. Includes:

**New agent or workflow step: git forensics analysis**

Analysis areas (read-only git commands only — no checkout, no build):

1. **Author Consistency Analysis**
   - Map unique author name+email combinations
   - Flag: same name, different emails; same email, different names; one-time contributors to critical paths
   - Check GPG signing presence/absence per author (unsigned commits from otherwise-signed contributors)
   - Temporal anomaly detection: commits outside normal working hours for that author's historical pattern

2. **History Integrity Analysis**
   - `git reflog` to detect force-push rewrites (compare reflog vs normal log)
   - `git fsck --dangling` to find unreachable objects (deleted blobs still in object DB)
   - Orphan branches (`git branch --all --remotes`) that may contain staging areas for malicious code
   - Detached HEAD commits not reachable from any branch

3. **File-Level Suspicion Scoring**
   - `git log --diff-filter=A --name-only` — files added by single-commit one-time contributors
   - Files modified only in large "cleanup" or "formatting" commits (noise to hide signal)
   - Binary files ever present in git history (`git log --all --full-history -- "*.so" "*.dll" "*.wasm"`)
   - Large files that appeared and were deleted (potential payload staging: `git log --diff-filter=D --stat`)

4. **`.gitattributes` Attack Surface**
   - Parse `.gitattributes` for `filter=`, `diff=`, `merge=` entries
   - For each filter, check if it's defined in `.git/config` and what command it runs
   - Flag any filter command that's not a well-known tool (e.g., `git-lfs`, `crypt`)
   - Check for smudge commands that fetch from network or execute code

5. **Commit Message Analysis (heuristic)**
   - Commits that claim to be "formatting only" but contain logic changes
   - Commits with no message or single-char messages in critical files
   - Commit message mismatch: claimed change vs actual diff (e.g., "fix typo" but modifies auth logic)

**Output:** `GIT-FORENSICS.md` with threat-level classified findings, merged into THREAT-SCAN.md

**Workflow integration:**
- `threat-scan.md` gains a `git_forensics` step that spawns this analysis early (after recon, before file scanning)
- Results feed context into other scan steps (e.g., "file X was added by a one-time contributor → increase scrutiny")
- Only runs if `has_git: true` and target is not a zip/archive

## Breadcrumbs

Related code and decisions found in the current codebase:

- `agents/gsd-threat-scanner.md` — `scan_deep_threats` step: inline git commands (`git branch --all`, `git log --all --oneline --graph -20`, `cat .gitattributes`) — these become the starting point for the forensics agent
- `get-shit-done/workflows/threat-scan.md` — workflow that would spawn the forensics agent; integration point is after `recon`, before `scan_backdoors`
- `agents/gsd-codebase-mapper.md` — structural parallel: gsd-codebase-mapper does read-only architectural analysis; gsd-git-forensics would do read-only commit history analysis in the same pattern
- `get-shit-done/SECURITY-SCANNER-TODO.md` — §1.6 mentions `git log`, `git diff`, `git reflog` as allowed tools; forensics agent builds on these

## Notes

All commands must be read-only git commands — no checkout, no branch creation, no git operations
that modify state. Safe command set (mirrors what threat scanner already allows):
`git log`, `git diff`, `git branch`, `git reflog`, `git show`, `git fsck`, `git cat-file`,
`git ls-tree`, `git rev-list`, `git shortlog`, `git blame`, `git stash list`

The agent's threat model for git forensics: "A sophisticated adversary had write access to
this repository. What traces might they have left? What might they have tried to erase?"

Possible standalone agent name: `gsd-git-forensics` — or fold into `gsd-threat-scanner` as
a structured pre-analysis step via `Task()` spawn. Standalone agent is cleaner and reusable
outside threat scanning context (e.g., code review of PRs from unknown contributors).
**Decision affects SEED-006 and SEED-008 integration points** — resolve during
`/gsd-discuss-phase` when this seed is picked up for implementation.

**Threat model interaction (see SEED-006 `build_threat_model` step):**
Git forensics findings should feed directly into the threat model. If forensics identifies
one-time contributors who touched auth-critical files, or force-push rewrites to security
modules, the threat model elevates those files to high-priority scan targets. The flow:
forensics (early) → threat model (mid) → scan dispatch (late) — each step narrows focus.

**Web search for contributor intelligence (mechanism defined in SEED-006):**
When `--web-search` is approved, git forensics can cross-reference contributor identities:
- Check if contributor emails appear in known-compromised account disclosures
- Look up package maintainer reputation for dependencies they added
- Search for CVEs or security advisories related to commits they authored in other repos
- Check if commit signing keys appear in revocation lists
Intelligence is tagged `[WEB-INTEL]` and marked as supplementary — never used as sole basis
for a finding. **Privacy note:** queries are public info only but the user should be informed
that contributor identities will be searched.

**Scanner purpose context:** See SEED-006 Notes for canonical scanner purpose definitions.
Git forensics is threat-scan-specific — detecting whether a malicious contributor planted
something in a brownfield repo. Does not apply to security audits where contributors are
trusted.
