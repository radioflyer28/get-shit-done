---
id: SEED-003
status: dormant
planted: 2026-04-14
planted_during: pre-project (no milestone yet)
trigger_when: when improving threat scanner detection precision, adding supply chain scanning, or when false negatives are reported in threat scans
scope: Medium
---

# SEED-003: Adversarial Pattern Library — `threat-patterns.yml` Semgrep Ruleset

## Why This Matters

The threat scanner currently embeds its detection patterns directly inside the agent's
`<step>` instructions as text descriptions and grep snippets. These patterns:
- Can't be run deterministically (agent re-interprets them each scan, introducing variance)
- Are hard to maintain/extend without modifying the agent definition
- Don't benefit from semgrep's AST-aware matching, taint tracking, or multi-file analysis
- Cover vanilla patterns but miss many language-idiomatic evasion techniques

SEED-002 covers OWASP vulnerability patterns for the security scanner. This seed is the
threat-scanner analog — but fundamentally different in character. Where SEED-002 looks for
*accidentally vulnerable code*, this looks for *deliberately malicious code* written to evade
casual review: obfuscated reverse shells, C2 beacons hidden in error handlers, supply chain
hooks disguised as telemetry, logic bombs with plausible deniability.

A dedicated `threat-patterns.yml` semgrep ruleset + per-language "Threat Scan Patterns"
sections in reference files means: the pre-scan orchestrator (SEED-001) runs these rules
deterministically, and the agent focuses on adversarial reasoning about results — not
mechanical grep matching.

## When to Surface

**Trigger:** When implementing SEED-001 (pre-scan orchestrator ready to consume rules), when
a false negative is reported in a threat scan, or when a milestone focuses on supply chain
security or threat intelligence.

This seed should be presented during `/gsd-new-milestone` when the milestone scope matches:
- Milestone implementing SEED-001 pre-scan orchestrator (natural pairing — need rules to run)
- Milestone improving threat scanner detection rate or reducing false negatives
- Milestone adding supply chain attack detection capability
- Milestone integrating threat scanning into CI/CD pipeline

## Scope Estimate

**Medium** — A focused phase (2-4 weeks). Includes:

**`get-shit-done/semgrep/threat-patterns.yml`** — Core ruleset covering:
- **Backdoors:** hardcoded auth bypasses, undocumented routes, logic bombs with date triggers, dynamic eval with obfuscated strings
- **C2 / Exfiltration:** outbound connections from unexpected contexts (install hooks, test setup, init), DNS exfil patterns, WebSocket channels not in stated functionality, clipboard/keylogger harvesting
- **Supply chain:** install hook patterns (`preinstall`, `postinstall`, `prepare`) that make network calls or write outside project directory; `setup.py cmdclass` overrides; `build.rs` network calls
- **Obfuscation fingerprints:** base64 decode-then-eval chains, charCode array joins, computed property call patterns, homoglyph character classes (Cyrillic/Greek in identifiers), bidirectional text override characters
- **OSINT harvesting:** bulk `process.env` access, `os.environ` enumeration, credential file path patterns (`.aws/credentials`, `.ssh/id_*`, `.kube/config`)

**Per-language "Threat Scan Patterns" sections** (added alongside OWASP patterns from SEED-002):
- Priority languages: JavaScript/TypeScript, Python, Shell/Bash, PowerShell, Go
- Each section: grep patterns + semgrep rules specifically for adversarial (not merely vulnerable) code

**YARA rules (stretch within this seed):**
- Binary analysis rules for `.wasm`, `.so`, `.class` files found in source trees
- Detect packed/obfuscated binaries, suspicious string tables, known malware family signatures
- Integrate with `yara` CLI if available (add to pre-scan tool registry as optional)

## Breadcrumbs

Related code and decisions found in the current codebase:

- `agents/gsd-threat-scanner.md` — inline grep patterns in `scan_backdoors`, `scan_exfiltration`, `scan_supply_chain`, `scan_osint`, `scan_obfuscation`, `scan_deep_threats` steps — these are the source material for the semgrep rules
- `get-shit-done/workflows/threat-scan.md` — workflow that would run the pre-scan with these rules
- `.planning/seeds/SEED-001-security-prescan-orchestrator.md` — the runtime that would execute `threat-patterns.yml`; `PRESCAN_TOOLS` env var would include `semgrep` with `--config get-shit-done/semgrep/threat-patterns.yml`
- `.planning/seeds/SEED-002-security-reference-sub-skills.md` — parallel effort for OWASP patterns; threat patterns go in separate files/sections
- `get-shit-done/SECURITY-SCANNER-TODO.md` — §3 (Custom Semgrep Rule Library) with proposed file structure: `threat-patterns.yml` distinct from per-language security rules

## Notes

Key design distinction from SEED-002:
- SEED-002 patterns: "this code has a vulnerability an attacker could exploit"
- SEED-003 patterns: "this code IS the attack — written deliberately to harm"

The adversarial framing changes what rules catch. Example:
- SEED-002 (vulnerable): `eval(user_input)` — developer made a mistake
- SEED-003 (malicious): `eval(Buffer.from('...','base64').toString())` — someone is hiding something

Rule severity tiers for `threat-patterns.yml`:
- `ERROR` — confirmed adversarial patterns (e.g., base64-then-eval in install hook)
- `WARNING` — strong indicators worth manual review
- `INFO` — anomalies that need context

Semgrep metavariable-pattern approach works well for multi-hop obfuscation chains (decode → store → eval in separate statements) — use `metavariable-pattern` and `pattern-inside` extensively.
