<purpose>
Audit a single GSD skill and produce a SKILL-AUDIT.md quality report. Resolves SKILL.md and its
workflow file from the skill name, spawns gsd-skill-auditor, handles return.
</purpose>

<available_agent_types>
- gsd-skill-auditor — Reads SKILL.md and its workflow file, runs 4 check types (structural,
  SMART, prompt quality, tool usage), writes SKILL-AUDIT.md with verdict
</available_agent_types>

<process>

<step name="parse-arguments">
Extract from $ARGUMENTS:
- SKILL_NAME: the first non-flag argument (required)
- OUTPUT_PATH: from `--output <path>` flag; default is `SKILL-AUDIT.md` in the current working directory
- DEPTH: from `--depth <value>` flag; default is `standard`. If `--structural-only` is present, set DEPTH=`quick` (D-03: --structural-only is an alias for --depth quick). Valid values: `quick`, `standard`, `deep`. Reject any other value with:
  ```
  Invalid depth '{VALUE}'. Must be one of: quick, standard, deep
  ```
- FIX_MODE: `true` if `--fix` flag is present, `false` otherwise
- JSON_MODE: `true` if `--json` flag is present, `false` otherwise

If SKILL_NAME is empty, display usage and stop:
```
Usage: /gsd-audit-skill <skill-name> [--output <path>] [--structural-only] [--depth quick|standard|deep] [--fix] [--json]
Example: /gsd-audit-skill gsd-plan-phase
Example: /gsd-audit-skill gsd-plan-phase --depth quick --json
```
</step>

<step name="resolve-skill-files">
**SECURITY: Validate skill name before constructing any file path.**

Check that SKILL_NAME matches the pattern `^[a-z0-9][a-z0-9-]*$` (lowercase alphanumeric
and hyphens only, must start with alphanumeric). Reject if the name contains `..`, `/`, `\`,
spaces, or `~`.

Error message for invalid names:
```
Invalid skill name '{SKILL_NAME}'. Skill names must be lowercase alphanumeric with hyphens
only (e.g., gsd-plan-phase).
```

After validation, resolve paths using Bash:

```bash
# Primary: Copilot installation
SKILL_MD="$HOME/.copilot/skills/${SKILL_NAME}/SKILL.md"

# Fallback: Claude Code installation
if [ ! -f "$SKILL_MD" ]; then
  SKILL_MD="$HOME/.claude/skills/${SKILL_NAME}/SKILL.md"
fi

if [ ! -f "$SKILL_MD" ]; then
  echo "Error: Skill '${SKILL_NAME}' not found."
  echo "Searched: $HOME/.copilot/skills/${SKILL_NAME}/SKILL.md"
  echo "          $HOME/.claude/skills/${SKILL_NAME}/SKILL.md"
  echo ""
  echo "Available skills in ~/.copilot/skills/:"
  ls "$HOME/.copilot/skills/" 2>/dev/null | grep -v '^\.' | head -20 || echo "  (none found)"
  exit 1
fi

# Extract execution_context @-reference (first @-line inside the <execution_context> block)
WORKFLOW_REF=$(awk '/<execution_context>/{found=1; next} found && /^@/{print; exit} /<\/execution_context>/{found=0}' "$SKILL_MD")
WORKFLOW_PATH=""
if [ -n "$WORKFLOW_REF" ]; then
  WORKFLOW_PATH=$(echo "$WORKFLOW_REF" | sed 's|^@||' | sed "s|~|$HOME|g")
  if [ ! -f "$WORKFLOW_PATH" ]; then
    # Workflow path unresolvable — auditor will flag as structural FAIL
    WORKFLOW_PATH="UNRESOLVABLE:${WORKFLOW_PATH}"
  fi
fi
```

Display resolved paths before spawning:
```
Auditing: {SKILL_NAME}
  SKILL.md  : {SKILL_MD}
  Workflow  : {WORKFLOW_PATH or "<none — no execution_context found>"}
  Report    : {OUTPUT_PATH}
```
</step>

<step name="spawn-auditor">
Spawn the auditor agent with a prompt containing the resolved file paths and depth setting:

```
Task(
  prompt="""
<audit_context>
skill_name: {SKILL_NAME}
skill_md_path: {SKILL_MD}
workflow_path: {WORKFLOW_PATH}
output_path: {OUTPUT_PATH}
depth: {DEPTH}
</audit_context>

Read skill_md_path and workflow_path. Run structural checks, SMART scoring, prompt quality
evaluation, and tool usage audit according to the specified depth (quick/standard/deep).
Write SKILL-AUDIT.md to output_path.
Return ## AUDIT COMPLETE with the verdict on the final line, or ## AUDIT FAILED with the error.
  """,
  subagent_type="gsd-skill-auditor",
  description="Audit skill: {SKILL_NAME}"
)
```
</step>

<step name="handle-return">
Parse the auditor's completion signal:

**`## AUDIT COMPLETE`:** Extract the verdict from the line immediately following the marker.

**JSON output (when JSON_MODE is true):**
After the auditor completes, read the findings from SKILL-AUDIT.md and serialize to stdout as:
```json
{
  "schema_version": "1.0",
  "skill": "{SKILL_NAME}",
  "verdict": "{PASS|PASS WITH WARNINGS|FAIL}",
  "score": {smart_average or null for quick depth},
  "findings": [
    { "area": "structural|smart|prompt|tool", "severity": "error|warning|info", "message": "..." }
  ]
}
```
Use `JSON.stringify(result, null, 2)` — never construct JSON via string concatenation (T-03-02).
Normal SKILL-AUDIT.md is still written to disk independently of JSON output.

**Fix routing (when FIX_MODE is true):**
After SKILL-AUDIT.md is written (and JSON emitted, if applicable), route all findings to the skill tuner:
1. Check whether `/gsd-tune-skill` is available (skill file exists at the expected installation path).
2. If available: invoke `/gsd-tune-skill {SKILL_NAME} --from-audit {OUTPUT_PATH}` with all findings.
3. If not available: print to stderr (not stdout, to avoid corrupting piped JSON): `⚠ --fix requested but gsd-tune-skill is not installed — skipping fix routing. Run /gsd-tune-skill manually.` The audit still completes normally.

Display summary:
```
─────────────────────────────────────
 Audit complete: {SKILL_NAME}
 Verdict: {PASS|PASS WITH WARNINGS|FAIL}
 Report:  {OUTPUT_PATH}
{If JSON_MODE: " JSON:    stdout"}
{If FIX_MODE and tuner available: " Fix:     routed to gsd-tune-skill"}
{If FIX_MODE and tuner missing:   " Fix:     skipped (gsd-tune-skill not installed)"}
─────────────────────────────────────
```

**`## AUDIT FAILED`:** Display the error message on the following line and suggest:
"Check that the skill name is correct and its files are readable."
</step>

</process>
