<purpose>
Orchestrate human-in-the-loop skill tuning. Workflow: collect symptom → invoke auditor for diagnosis → prioritize findings by relevance → generate diffs → review with refinement loop (max 3 iterations) → apply approved diffs → verify no regressions.
</purpose>

<available_agent_types>
- gsd-skill-tuner — Core logic for semantic finding prioritization, diff generation, refinement-driven regeneration
</available_agent_types>

<process>

<step name="parse_arguments">
Extract from $ARGUMENTS:
- skill_name (required, first positional)
- Optional flags: --transcript <path>, --dry-run, --batch <file>

Validate: skill_name non-empty and matches valid skill name pattern (alphanumeric + hyphens).

If missing skill_name: Error — "Usage: /gsd-tune-skill <skill-name> [options]"

If flag issues (e.g., --batch without file path): Error — "Flag {flag} requires a value: {flag} <path>"
</step>

<step name="check_skill_exists">
Verify the skill exists in the GSD installation:
```bash
gsd-audit-skill {skill_name} --help 2>&1 | grep -q "Usage:" || (echo "Skill not found: {skill_name}"; exit 1)
```

If skill not found: Error — "Skill '{skill_name}' not found. Run `gsd list-skills` to see installed skills."
</step>

<step name="handle_batch_vs_single">
**If --batch flag is present:**
- Load JSON file from --batch argument
- Validate: array of objects, each with "skill" and "symptom" fields
- If invalid format: Error — show example JSON structure
- Proceed to batch_workflow step
- Skip single-skill steps

**If --batch flag absent (single-skill mode):**
- Proceed to intake_symptom step
- Execute single-skill workflow
</step>

<step name="intake_symptom">
**Single-skill mode only (batch mode skips this, has symptoms in file)**

Use AskUserQuestion (or vscode_askquestions for Copilot):
```
Header: "Symptom"
Question: "What issue should we fix in {skill_name}?"
Options: (none — free-form text input)
```

User provides narrative description of the problem.

If user input is empty or whitespace: Re-prompt once. If still empty, error.

If --transcript flag is present: Pass transcript path to finding prioritization step for signal extraction.
</step>

<step name="invoke_auditor">
**Single-skill mode:**

Run audit command:
```bash
gsd-audit-skill {skill_name}
```

This produces SKILL-AUDIT.md in the phase directory with findings table, severity levels, remediation guidance.

Wait for audit to complete. If audit fails: Error — "Audit failed. Cannot proceed without findings. Error: {message}"

**Batch mode:**

For EACH issue in batch array, invoke audit in parallel if possible:
```bash
gsd-audit-skill {skill_name} &  # background
```

Collect all SKILL-AUDIT.md outputs.

If any audit fails: Warn and continue (skip that skill in this tuning batch).
</step>

<step name="load_and_prioritize_findings">
**Single-skill mode:**

Read SKILL-AUDIT.md from phase directory.

Parse findings table:
- Column: Finding ID, Category, Severity, Description, Remediation

Invoke gsd-skill-tuner agent with:
- skill_name
- audit_findings_md_path (path to SKILL-AUDIT.md)
- symptom_description (from intake or --transcript extraction)
- iteration_count: 1
- max_iterations: 3

Agent performs semantic prioritization:
- Input: symptom + findings
- Output: re-ranked findings sorted by relevance score (top 3-5 for action)

**Batch mode:**

For EACH issue (skill + symptom pair):
- Read that skill's SKILL-AUDIT.md
- Invoke tuner with that issue's symptom
- Collect prioritized findings per issue

Continue to next step after all issues are prioritized.
</step>

<step name="generate_diffs">
**Single-skill mode:**

Invoke gsd-skill-tuner agent with:
- skill_name
- audit_findings_md_path
- symptom_description
- prioritized_findings (from previous step)
- iteration_count: 1
- max_iterations: 3
- refinement_instruction: null (initial generation)

Agent generates candidate diffs:
- For each top-ranked finding, propose minimal change(s)
- Link each diff to the specific finding
- Format as syntax-highlighted inline edits (terminal colors or markdown per runtime)
- Include rationale per diff

**Batch mode:**

For EACH issue, invoke tuner to generate diffs.
Collect all diffs per issue.

Continue to next step after all diffs are generated.
</step>

<step name="present_diffs">
**Single-skill mode:**

Display proposed diffs to user with runtime-adapted formatting:
- Terminal: ANSI color codes (red for deletions, green for additions)
- Copilot/Markdown: Inline code with emoji markers (🔴 removed, 🟢 added)

Show iteration counter: "Iteration 1 of 3"

Use AskUserQuestion:
```
Header: "Review"
Question: "Review the proposed changes. What's your decision?"
Options:
  - "Approve" — Apply these diffs and commit
  - "Reject" — Don't apply; end tuning for this skill
  - "Refine" — Regenerate diffs with different focus
```

**Batch mode:**

Display ALL diffs grouped by skill:
```
═══════════════════════════════════════════
BATCH REVIEW: {count} skills, {diff_count} proposed changes
═══════════════════════════════════════════

[{skill_name}]
- Finding: {description}
  Proposed: {1-line summary of change}
  
[{skill_name}]
...
```

Use AskUserQuestion:
```
Header: "Batch Review"
Question: "Approve all proposed changes?"
Options:
  - "Approve all" — Apply all diffs and commit batch
  - "Approve selected" — Choose which to apply
  - "Reject all" — Don't apply any
```

If "Approve selected": Prompt for per-skill selection (checkboxes or per-skill yes/no).
</step>

<step name="refinement_loop">
**Single-skill mode:**

If user selected "Refine":

Iteration counter increments (now 2 of 3, or 3 of 3).

Use AskUserQuestion:
```
Header: "Refine"
Question: "How should I adjust the proposed changes?"
Options:
  - "Expand context" — Add more detail/examples/guardrails
  - "Simplify language" — Remove jargon, shorten sentences
  - "Add guardrails" — Include error handling, validation
  - "Shorten" — Remove verbosity
  - "Increase rigor" — More specific success criteria
  - "Adjust tone" — Change from authoritative to collaborative
  - "Other: [user types custom instruction]"
```

Capture user's refinement selection or free-form instruction.

Re-invoke tuner agent with:
- Same skill, findings, symptom
- refinement_instruction: {user's selected or typed instruction}
- iteration_count: {current iteration}
- max_iterations: 3

Agent regenerates diffs WITHOUT re-invoking auditor (diffs are regenerated from existing findings).

Return to present_diffs step to show updated diffs.

**If iteration_count reaches 3 and user selects "Refine" again:**

Gate with: "Max refinements (3) reached. Approve these diffs, or use `--force-override` to continue refinement."

If --force-override: Continue refinement beyond 3 (user responsible).
If not: Require approval/rejection.

**Batch mode:**

If any refinement needed:
- Collect refinement instruction from user (applies to all remaining issues)
- Re-invoke tuner for all unfinaliz​ed issues with refinement instruction
- Return to present_diffs step

Within batch, each skill can iterate independently (no global iteration cap shared across skills).
</step>

<step name="apply_and_commit">
**If user approved diffs:**

**Single-skill mode:**

Apply diffs to skill files:
- For each approved diff, apply the change to the specified file and lines
- Validate: no syntax errors, files remain consistent

Commit changes:
```bash
git add {modified_files}
git commit -m "fix(skill): tune {skill-name} — {symptom-summary}"
```

Message format: `fix(skill): tune {skill-name} — {one-line summary of the symptom/fix}` (per requirement TUNE-07)

Example: `fix(skill): tune gsd-auditor — add timeout handling for large JSON inputs`

**Batch mode:**

Apply all approved diffs (per per-skill selections if user chose "Approve selected"):
```bash
git add {all_modified_files}
git commit -m "fix(batch): tune {count} skills — {theme-summary}"
```

Message format: `fix(batch): tune {count} skills — {comma-separated symptom themes}`

Example: `fix(batch): tune 2 skills — timeout handling + retry logic`

**If --dry-run flag:**

Skip this step entirely. End workflow after present_diffs step. No files modified, no commits.
</step>

<step name="regression_verification">
**If diffs were applied (--dry-run not used):**

Run structural-only audit on each modified skill:
```bash
gsd-audit-skill {skill_name} --structural-only
```

Collect results. If any skill's audit returns non-zero (structural failure):
- Error — "Regression detected in {skill_name}. Audit findings:"
- Revert last commit
- Display audit errors
- User can fix manually or re-run tuning with different focus

If all audits pass:
- Success — "Regression verification passed for {skill_names}"
- Display results to user

**Batch mode:**

Verify all modified skills in parallel if possible.

Report: "Verified {count} skills — all passed structural checks"

</step>

<step name="interactive_validation">
If running in Copilot or other interactive runtime:

After refinement loop completes (before commit), pause and ask:
```
Header: "Ready"
Question: "Ready to commit these changes?"
Options:
  - "Yes, commit"
  - "No, make more changes" → loops back to refinement step
  - "Cancel" → discard all proposed changes, exit
```

This gives user final gate before applying.

For batch mode, ask after ALL diffs are reviewed and approved but before applying all:
```
Header: "Batch Ready"
Question: "Apply all {count} approved changes?"
Options:
  - "Yes, apply batch"
  - "No, cancel"
```
</step>

</process>

---

## Batch Mode Processing

**Activation:** When `--batch <file>` flag is provided.

**Overview:**
1. Load multiple (skill, symptom) pairs from JSON file
2. Invoke audits for all skills in parallel
3. Generate diffs upfront (tuner invoked once per issue)
4. Present ALL proposed diffs together (grouped by skill)
5. Unified approval gate (approve all, partial, or none)
6. Apply selected diffs atomically in one commit
7. Verify all modified skills with `--structural-only` audit

**Batch File Format:**
```json
[
  {"skill": "gsd-auditor", "symptom": "Timeout on large input"},
  {"skill": "gsd-executor", "symptom": "Missing retry logic"},
  {"skill": "gsd-planner", "symptom": "Unclear error messages"}
]
```

**Batch Workflow Execution:**

1. **Load and validate batch file**
   - Parse JSON from --batch file
   - Validate each entry has "skill" and "symptom"
   - Error if malformed: show example format

2. **Parallel audit invocation**
   - For each issue: invoke `gsd-audit-skill {skill}` in background
   - Collect all SKILL-AUDIT.md outputs
   - On audit failure for an issue: skip that skill, continue

3. **Generate all diffs upfront**
   - For each issue, invoke tuner agent once with:
     - skill name
     - symptom
     - audit findings path
     - iteration_count: 1 (no refinement in initial generation)
   - Collect all proposed diffs per issue

4. **Unified review presentation**
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   BATCH REVIEW: 3 skills, 5 proposed changes
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   [gsd-auditor]
   - Finding: Timeout handling
     Proposed: Add explicit error handler for 30s timeout
   - Finding: Unclear error messages
     Proposed: Expand error text with context and recovery steps
   
   [gsd-executor]
   - Finding: Missing retry logic
     Proposed: Add exponential backoff for transient failures
   
   [gsd-planner]
   - Finding: No validation strategy
     Proposed: Add SMART dimension scoring
   
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

5. **Bulk approval options**
   - `Approve all` — Apply all {N} diffs
   - `Approve selected` — Choose per-skill (checkboxes or individual questions)
   - `Reject all` — Don't apply any

6. **Atomic commit**
   ```bash
   git add {all_modified_files}
   git commit -m "fix(batch): tune 3 skills — timeout handling + retry logic + clarity"
   ```
   Message format: `fix(batch): tune {count} skills — {comma-separated themes}`

7. **Batch verification**
   - For each modified skill: `gsd-audit-skill {skill} --structural-only`
   - Collect results and report:
     ```
     Verified 3 skills — all passed structural checks
     ```
   - On failure: Revert last commit and report which skill failed

**Batch Mode Refinement:**
- If user requests refinement during batch review, refinement applies to ALL diffs in that batch
- Tuner is invoked once per issue with the refinement_instruction
- New diffs presented together; user re-approves in bulk

---

## Transcript Extraction

**Activation:** When `--transcript <path>` flag is provided.

**Overview:**
Transcript files (session logs, error recordings, markdown notes) often contain implicit signals about skill problems. Transcript extraction parses these signals and augments the user's direct symptom description, improving semantic finding prioritization.

**Supported formats:**
- Plain text files (.txt)
- JSON logs (array or object format)
- Markdown (.md) with code blocks and stacktraces
- Unstructured logs (timestamp lines, error messages mixed)

**Friction signal extraction:**

1. **Error keywords** (severity: high)
   - "timeout", "fail", "error", "exception", "undefined", "null", "crash", "panic"
   - Each occurrence scored by context (proximity to skill name increases relevance)

2. **Performance keywords** (severity: medium)
   - "slow", "hang", "freeze", "unresponsive", "delay", "lag", "stuck"

3. **Clarity keywords** (severity: low)
   - "unclear", "confusing", "ambiguous", "unexpected", "misleading", "wrong"

4. **User intent markers** (severity: variable)
   - "should", "must", "needs to", "always", "never", "must not"

**Extraction process:**

1. Read transcript from --transcript path
2. Split into lines; look for friction patterns
3. Extract matching keywords with surrounding context (e.g., 2-3 words before/after)
4. Group by keyword category (error, performance, clarity, intent)
5. Weight by severity and frequency
6. Truncate to last 5000 characters (or ~100 lines) to keep augmented symptom focused
7. Warn user: "Transcript will be analyzed. Ensure no sensitive data included."

**Symptom augmentation example:**

Original symptom: "Times out on large input"

Extracted signals from transcript:
```
error keywords: ["timeout:3", "hang:2"]
performance: ["slow:1", "unresponsive:1"]
intent: ["should retry:2"]
```

Augmented symptom for semantic ranking:
```
"Times out on large input. Session showed timeout errors (3 occurrences), 
hanging behavior, slow/unresponsive execution. Should implement retry logic."
```

**Safety caps:**
- Truncate raw transcript to last 5000 chars before extraction
- Warn before processing: "Transcript contains potential PII. Ensure safe before proceeding."
- Do NOT log transcript content to commits or reports
- Extract only friction signals; never leak original transcript data

**Integration with single-skill and batch modes:**
- Single-skill: Augmented symptom passed to tuner agent (improves semantic ranking)
- Batch mode: Each issue can optionally have a transcript augmentation applied independently

---

</process>

---

*Workflow: tune-skill*
*Invoked by: /gsd-tune-skill command*
*Coordinates: gsd-skill-tuner agent + gsd-audit-skill command*
*Output: Tuned skill files, commit, TUNE-{date}.md session log*
