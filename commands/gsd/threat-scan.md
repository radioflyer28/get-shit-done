---
name: gsd:threat-scan
description: Scan untrusted codebase for deliberate threats — backdoors, trojans, data exfiltration, supply chain attacks
argument-hint: "[target-path] [--depth=quick|standard|deep] [--focus=backdoors|exfil|supply-chain|osint|all] [--quarantine]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---
<objective>
Scan an untrusted codebase for deliberate malicious code. Assumes hostile intent — looks for:
- Backdoors and hidden access points (`--focus=backdoors`)
- Data exfiltration channels (`--focus=exfil`)
- Supply chain attack vectors (`--focus=supply-chain`)
- OSINT and credential harvesting (`--focus=osint`)

Static analysis only — no code from the target is ever executed.

Use `--quarantine` to isolate suspicious files after scanning.

Output: THREAT-SCAN.md with verdict (CLEAN / SUSPICIOUS / COMPROMISED).
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/threat-scan.md
</execution_context>

<context>
Arguments: $ARGUMENTS — target path (required for non-current directory), optional flags for depth, focus, and quarantine.
</context>

<process>
Execute @~/.claude/get-shit-done/workflows/threat-scan.md.
Preserve all workflow gates. Never execute code from the target codebase.
</process>
