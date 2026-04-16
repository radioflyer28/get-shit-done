<purpose>
Collect skill name, description, and type from the user; generate a complete,
convention-compliant GSD skill scaffold; validate structural integrity; register new agents
in the agent registry and install system; confirm file recognition.
</purpose>

<available_agent_types>
- gsd-skill-scaffolder — Generates command, workflow, and agent files for a new GSD skill
  based on name, description, and type. Produces complete, working content from the description.
</available_agent_types>

<process>

<step name="parse-arguments">
Extract from $ARGUMENTS:
- TEMPLATE_MODE: `true` if `--template` flag is present, `false` otherwise

Display workflow banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► BUILD SKILL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If TEMPLATE_MODE is true, display: `Mode: Template (bare stubs with TODO: markers)`
If TEMPLATE_MODE is false, display: `Mode: Auto-generate (full content from description)`
</step>

<step name="gather-inputs">
Collect three required inputs interactively.

**1. Skill name:**

AskUserQuestion:
- header: "Skill name"
- question: "What is the skill name? Use lowercase with hyphens (e.g., gsd-my-skill)."

**Validate:** Check that the name matches `^[a-z0-9][a-z0-9-]*$`. Reject if name contains
`..`, `/`, `\`, spaces, or `~` (path-traversal prevention):
```
Invalid skill name. Use lowercase alphanumeric and hyphens only (e.g., gsd-my-skill).
Skill names must start with a letter or digit and contain no spaces or special characters.
```
Re-ask if invalid. Maximum 3 attempts before aborting with error.

**Check for existing files:**
```bash
test -f "commands/gsd/{SKILL_NAME}.md" && echo "EXISTS:command" || true
test -f "get-shit-done/workflows/{SKILL_NAME}.md" && echo "EXISTS:workflow" || true
test -f "agents/gsd-{SKILL_NAME}.md" && echo "EXISTS:agent" || true
```
If any exist, display which files exist and ask:
AskUserQuestion:
- header: "Files exist"
- question: "Files already exist for '{SKILL_NAME}'. Overwrite them?"
- options: ["Overwrite existing files", "Abort — use a different name"]

If "Abort": return to name input.

**2. Description:**

AskUserQuestion:
- header: "Description"
- question: "One sentence describing what this skill does. Use an imperative verb and name the specific output (e.g., 'Create a detailed phase plan with research and verification loop')."

**3. Skill type:**

AskUserQuestion:
- header: "Skill type"
- question: "What type of skill is this?"
- options:
  - label: "orchestrator"
    description: "Spawns subagents. Generates command + workflow + agent file."
  - label: "standalone"
    description: "Self-contained, no subagents. Generates command + workflow only."
  - label: "hybrid"
    description: "Conditionally uses agents. Generates command + workflow + agent file."
  - label: "informational"
    description: "Reference or guidance content. Generates command + workflow only."

Store: SKILL_NAME, DESCRIPTION, SKILL_TYPE.

Derive FILE_SET from SKILL_TYPE (D-02):
- orchestrator → ["command", "workflow", "agent"]
- standalone    → ["command", "workflow"]
- hybrid        → ["command", "workflow", "agent"]
- informational → ["command", "workflow"]

Set GENERATES_AGENT = (SKILL_TYPE == "orchestrator" OR SKILL_TYPE == "hybrid")
</step>

<step name="check-agent-reuse">
**Skip entirely if GENERATES_AGENT is false (standalone or informational types).**

Read ONLY the frontmatter block of each agent file — use head to limit reads to the first
15 lines of each file (prevents loading full agent file content):

```bash
for agent_file in agents/gsd-*.md; do
  echo "=== $agent_file ==="
  head -15 "$agent_file"
  echo "---END---"
done
```

Extract `name:` and `description:` from each frontmatter block.

Keyword-match: split DESCRIPTION into words, exclude stop words ("a", "the", "for", "with",
"and", "or", "to", "of", "in", "that", "this", "is", "an"). Check if any remaining word
appears in an agent's name or description field (case-insensitive).

If matches found (minimum 1 significant keyword overlap):
```
◆ Existing agents may overlap with your description:
{for each match:}
  • {agent-name}: {agent-description}

Consider reusing one of these instead of creating a new agent.
```

AskUserQuestion:
- header: "Agent reuse"
- question: "Create a new agent, or reference an existing one?"
- options:
  - label: "Create new agent — none of these fit"
  - label: "Reference existing — use {top-match-name} in the workflow"
  - label: "Show all agents — let me browse first"

If "Reference existing":
  Set REUSE_AGENT=true, REUSED_AGENT_NAME={chosen agent name}
  Remove "agent" from FILE_SET
  Display: `◆ Will reference {REUSED_AGENT_NAME} in generated workflow instead of creating new agent`

If "Show all agents":
  List all agent names + descriptions. Re-ask question above.

If "Create new agent" or no matches found:
  Set REUSE_AGENT=false, REUSED_AGENT_NAME=""
</step>

<step name="spawn-scaffolder">
**Check description clarity (D-01):**

If DESCRIPTION meets ANY of these conditions, ask one targeted clarifying question before spawning:
- Fewer than 6 words
- Contains vague terms: "stuff", "things", "handle", "manage", "deal with", "do stuff"
- Type/description conflict: SKILL_TYPE is "standalone" but DESCRIPTION implies subagent spawning
  (contains "spawn", "delegate", "subagent", "orchestrate")

Example clarifying questions:
- Short description: "Can you expand the description? What does this skill produce, and for whom?"
- Vague terms: "'{VAGUE_TERM}' is unclear — what specifically does this skill do or create?"
- Type conflict: "Your description implies agent spawning but type is 'standalone'. Use 'orchestrator' instead, or clarify the description?"

Update DESCRIPTION with the user's clarified answer.

**Spawn gsd-skill-scaffolder:**

Display: `◆ Generating skill files...`

Build the scaffold context:
```xml
<scaffold_context>
  <skill_name>{SKILL_NAME}</skill_name>
  <description>{DESCRIPTION}</description>
  <skill_type>{SKILL_TYPE}</skill_type>
  <file_set>{FILE_SET as comma-separated: command,workflow,agent or command,workflow}</file_set>
  <template_mode>{TEMPLATE_MODE}</template_mode>
  <reuse_agent>{REUSE_AGENT}</reuse_agent>
  <reused_agent_name>{REUSED_AGENT_NAME}</reused_agent_name>
</scaffold_context>
```

```
Task(
  prompt=<scaffold_context block above>,
  subagent_type="gsd-skill-scaffolder",
  description="Generate skill: {SKILL_NAME}"
)
```

**Handle return:**
- `## SCAFFOLD COMPLETE`: continue to validate-output
- `## SCAFFOLD BLOCKED`: display reason and partial results
  AskUserQuestion: "Provide more context and retry" / "Abort"
  If retry: re-spawn with additional context appended to scaffold_context
  If abort: exit
</step>

<step name="validate-output">
Run structural validation on all generated files (SCAFFOLD-05).

**Primary path — invoke /gsd-audit-skill:**
```bash
which gsd-audit-skill 2>/dev/null || \
  ls "$HOME/.copilot/skills/gsd-audit-skill/SKILL.md" 2>/dev/null && echo "AUDITOR_AVAILABLE=true" || echo "AUDITOR_AVAILABLE=false"
```

If AUDITOR_AVAILABLE=true:
```
/gsd-audit-skill {SKILL_NAME} --depth quick
```
- PASS: display `✓ Structural integrity check passed`
- FAIL: display findings
  AskUserQuestion: "Fix automatically (re-run scaffolder with audit findings)" / "Fix manually (edit files)" / "Skip validation"
  If "Fix automatically": re-spawn scaffolder with audit findings appended to scaffold_context

**Fallback — inline structural check (if auditor unavailable):**

Print to stderr: `Warning: /gsd-audit-skill not found — running inline structural checks only`

For each generated file in FILE_SET:
1. Frontmatter present: `grep -c "^---" {file}` >= 2
2. Has name field: `grep -c "^name:" {file}` >= 1
3. Has description field: `grep -c "^description:" {file}` >= 1
4. Has allowed-tools field: `grep -c "^allowed-tools:" {file}` >= 1
5. Has `<objective>` tag: `grep -c "<objective>" {file}` >= 1
6. Has `<process>` tag: `grep -c "<process>" {file}` >= 1
7. No ~/.claude/ paths: `grep -c "~/.claude/" {file}` == 0
8. No tools: field: `grep -c "^tools:" {file}` == 0

Display per-file results:
```
Inline structural check: {filename}
  ✓ Frontmatter present
  ✓ name field
  ✓ description field
  ✓ allowed-tools field
  ✓ <objective> tag
  ✓ <process> tag
  ✓ No ~/.claude/ paths
  ✓ No tools: field
```

Any FAIL item is reported but does not abort (soft-warning pattern).
</step>

<step name="register-agent">
**Skip if GENERATES_AGENT is false OR REUSE_AGENT is true.**

Display registration prompts (SCAFFOLD-06).

**1. agent-contracts.md registration:**
```
◆ New agent created: agents/gsd-{SKILL_NAME}.md

Register in get-shit-done/references/agent-contracts.md?
This adds the agent to the registry table so workflows can route to it and detect completion markers.

Entry to add:
  | gsd-{SKILL_NAME} | {DESCRIPTION} | `## SCAFFOLD COMPLETE`, `## SCAFFOLD BLOCKED` |
```

AskUserQuestion:
- header: "Register in agent-contracts.md"
- question: "Add gsd-{SKILL_NAME} to the agent registry?"
- options: ["Add to agent-contracts.md (recommended)", "Skip"]

If confirmed: Open `get-shit-done/references/agent-contracts.md`, find the Agent Registry table,
append the new row after the last existing row. Do NOT reformat the existing table.

**2. bin/install.js CODEX_AGENT_SANDBOX:**
```
◆ Add gsd-{SKILL_NAME} to Codex sandbox permissions?

This allows the agent to run with workspace-write access in OpenAI Codex runtime.
Entry to add to CODEX_AGENT_SANDBOX object in bin/install.js:
  'gsd-{SKILL_NAME}': 'workspace-write',
```

AskUserQuestion:
- header: "Register in CODEX_AGENT_SANDBOX"
- question: "Add gsd-{SKILL_NAME} to bin/install.js CODEX_AGENT_SANDBOX?"
- options: ["Add to CODEX_AGENT_SANDBOX (recommended)", "Skip"]

If confirmed: Open `bin/install.js`, find the `CODEX_AGENT_SANDBOX` object, insert the new
entry after the last existing entry in the object (before the closing `}`).
</step>

<step name="install-validate">
Run install validation (SCAFFOLD-08):
```bash
node bin/install.js --dry-run 2>&1 | head -50
```

If output mentions the new skill name or new files: display `✓ Install system recognizes new files`
If output does not confirm: display:
```
⚠ New files not explicitly confirmed in --dry-run output.
Run 'node bin/install.js' manually to deploy to ~/.copilot/
```

**Display final summary:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ✓ Skill '{SKILL_NAME}' created

Files generated:
{for each file in FILE_SET:}
  ✓ {file path}

Validation: {PASSED / WARNINGS (see above)}
Install:    {confirmed / manual install needed}

Next steps:
  • Review and refine the generated files
  • Run /gsd-audit-skill {SKILL_NAME} for a full quality report
  • Run node bin/install.js to deploy to ~/.copilot/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
</step>

</process>
