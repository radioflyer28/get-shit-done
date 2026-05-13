---
name: gsd:security-audit
description: Scan own codebase for security vulnerabilities, exposed secrets, dependency CVEs, and misconfigurations
argument-hint: "[--depth=quick|standard|deep] [--focus=deps|secrets|code|config|all] [--files=path,...]"
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
Proactively scan your own codebase for security vulnerabilities. Covers:
- Dependency CVEs (`--focus=deps`)
- Hardcoded secrets and credentials (`--focus=secrets`)
- OWASP Top 10 code vulnerabilities (`--focus=code`)
- Infrastructure and configuration issues (`--focus=config`)

Depth controls thoroughness: `quick` (pattern matching), `standard` (default, cross-file analysis), `deep` (taint tracking, ReDoS, TOCTOU).

Output: SECURITY-AUDIT.md in the phase directory.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/security-audit.md
</execution_context>

<context>
Arguments: $ARGUMENTS — optional flags for depth, focus, and file scope.
</context>

<process>
Execute @~/.claude/get-shit-done/workflows/security-audit.md.
Preserve all workflow gates.
</process>
