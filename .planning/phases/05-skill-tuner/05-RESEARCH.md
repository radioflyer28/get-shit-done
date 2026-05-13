# Phase 5: Skill Tuner - Research

**Researched:** 2026-04-15
**Status:** Ready for planning

## Executive Summary

Phase 5 builds `/gsd-tune-skill` for human-in-the-loop skill improvement. The workflow: (1) user describes symptom, (2) tuner invokes auditor for diagnosis, (3) findings re-ranked by semantic relevance, (4) minimal diffs proposed with syntax highlighting, (5) user refines up to 3 times, (6) approved edits committed with regression verification. 

This phase integrates tightly with Phase 2 (auditor as diagnosis source) and Phase 3 (structural-only flag for verification). Key implementation challenges: semantic ranking precision vs. token cost, inline diff rendering across multiple runtime contexts, and batch workflow efficiency.

## Domain Analysis

### What We're Building

A surgeon's workbench for skill improvement. Not a bulk automigration tool — precise, human-controlled edits backed by audit diagnosis. Three personas:

1. **Skill author** — Describing a specific failure: "Agent times out on large JSON"
2. **Skill maintainer** — Sweeping issues from a batch file with similar themes
3. **Debugging partner** — Working from a session transcript to extract friction signals

### Integration Points

**Depends on (HARD dependency):**
- Phase 2: `/gsd-audit-skill` command + agent + output format (SKILL-AUDIT.md)
- Phase 3: `--structural-only` flag on auditor for regression verification

**Connects to (used by):**
- Phase 4: Scaffolder validates via `/gsd-audit-skill --fix` → routes to tuner

**Shares:**
- `references/skill-smart-criteria.md` — Validate fixes don't regress SMART dimensions
- `references/skill-authoring.md` — Respect structural conventions when proposing edits

### Operational Constraints

| Constraint | Implication | Implementation Note |
|------------|-------------|-------------------|
| Multi-runtime compatibility | UX must adapt to terminal, Copilot, Gemini CLI outputs | Format detection; fallback to safe defaults |
| Non-destructive edits | Only surgical diffs, never full file rewrites | Unified diff format + line-by-line validation |
| 3 refinement max | Prevent infinite loops without user override | Counter + gate before auto-rejection |
| Token budget for semantic analysis | Semantic ranking costs more than string matching | Profile first; consider fallback strategy |
| Audit findings as diagnosis source | Never re-analyze raw files | Tuner always reads SKILL-AUDIT.md findings, not skill files |

## Technical Approaches

### Symptom Intake (User Input)

**Decision Locked: Hybrid approach (D-01)**

| Approach | Tradeoffs | Implementation Notes |
|----------|-----------|----------------------|
| **Free-form only** | Simple, natural language | Risk: Ambiguous symptom leads to wrong findings prioritization |
| **Structured only** | Explicit, unambiguous | Risk: Friction — users resent filling forms for what feels like a chat |
| **Hybrid (SELECTED)** | Natural first, structured follow-up if needed | Ask structured Qs only when audit findings are inconclusive |

**Implementation path:**
1. `AskUserQuestion` for narrative symptom: "What's the issue you'd like me to fix?"
2. If semantic analysis returns low-confidence matches (<0.65), prompt: "Your symptom mentions X but findings show Y. Can you clarify: (a) Issue description, (b) Expected behavior, (c) Actual behavior?"
3. Use structured answers to re-rank and re-filter findings

**CLI Integration:**
```bash
/gsd-tune-skill myskill
# Prompts: "Symptom? " → read narrative
# If inconclusive → Prompts: "Clarify issue/expected/actual? " → structured Q&A
```

---

### Finding Prioritization (Diagnosis)

**Decision Locked: Semantic analysis (D-02)**

**Why not string similarity:** Audit findings may be tagged "Prompt clarity" but user symptom "Agent fails on ambiguous input" — keyword matching would miss this unless we pre-tag comprehensively (brittle).

**Semantic approach (CHOSEN):**

| Strategy | Cost | Accuracy | Implementation |
|----------|------|----------|-----------------|
| **String similarity** | ~0 tokens | 65% (keyword-dependent) | Regex/fuzz matching against finding titles/descriptions |
| **Semantic similarity** | ~200-500 tokens per ranking | 85% (catches implicit) | Embed symptom + findings, compute cosine similarity, re-sort |
| **LLM re-rank agent** | ~1000+ tokens | 90%+ (context-aware) | Spawn sub-agent to reason about relevance |

**Chosen: Semantic similarity.** Compute embeddings locally (claude-js SDK) or via minimal LLM call.

**Implementation notes:**
- Use `@anthropic-ai/sdk` embedding models if available (Claude models may not expose embeddings — fallback to manual similarity scoring)
- Manual similarity: (a) Extract symptom keywords, (b) Score each finding by keyword overlap + topic affinity, (c) Re-sort by score
- **Fallback if semantic fails:** revert to string similarity without error — diagnostic precision degrades gracefully

**Token budget:** ~300-500 tokens per tune operation (acceptable for interactive use).

---

### Diff Presentation (Review)

**Decision Locked: Syntax-highlighted inline edits (D-03)**

| Format | Pros | Cons | When to use |
|--------|------|------|------------|
| **Unified diff** | Familiar, compact, portable | Dense — hard to spot changes visually | Batch mode, when space is critical |
| **Side-by-side** | Full context, easy scanning | Verbose, horizontal scrolling | Code review tools, high-stakes changes |
| **Inline highlighting** | Visual pop-out, before/after clear | Runtime-dependent rendering | (SELECTED) Terminal + Copilot where highlighting works |
| **Minimal context** | Tight, focused | Risky — loses context for understanding impact | Never use alone |

**Implementation:**
1. **Terminal rendering:** Use ANSI color codes — red for deletions, green for additions
   ```
   - const x = 42;
   + const x = Math.max(42, input);
   ```

2. **Copilot/Markdown rendering:** Use markdown inline code + emoji markers
   ```
   Before: `const x = 42;`
   After: `const x = Math.max(42, input);`
   
   Change: Update constant to validate against input ✨
   ```

3. **Runtime detection:**
   ```javascript
   if (process.env.TERM) { // Terminal
     format = "ansi-color"
   } else if (context.runtime === "copilot") { // VS Code
     format = "markdown-inline"
   } else { // Fallback
     format = "unified-diff"
   }
   ```

**Rationale:** Immediate visual clarity for approval/rejection gates. Inline highlights make the intent obvious without requiring diff literacy.

---

### Refinement Workflow (Iteration)

**Decision Locked: Hybrid options (D-04)**

Max iterations: 3 before user must approve or explicitly override.

| Iteration Model | UX | Implementation |
|-----------------|-----|-----------------|
| **Free-form only** | User types anything | Flexible but requires robust parsing of intent |
| **Presets only** | Menu: "Expand context", "Simplify", etc. | Guided but rigid — may not cover user's intent |
| **Hybrid (SELECTED)** | Menu + "Other: [type custom]" | Best of both |

**Preset taxonomy** (design considerations):
- **"Expand context"** — Add more detail to prompts, include more examples
- **"Simplify language"** — Remove jargon, shorten sentences, clarify intent
- **"Add guardrails"** — Include error handling, validation, edge case coverage
- **"Shorten"** — Remove verbosity without losing meaning
- **"Increase rigor"** — More specific success criteria, better verification
- **"Adjust tone"** → Shift from authoritative to collaborative, or vice versa

**Implementation:**
```
Iteration 1 of 3. Happy with this diff?
[ ] Approve — Apply this fix
[ ] Reject — Don't apply
[ ] Refine: 
    [ ] Expand context
    [ ] Simplify language
    [ ] Add guardrails
    [ ] Shorten
    [ ] Other: [user types custom instruction]
```

**Iteration loop:**
1. Generate initial diffs (from audit findings)
2. User picks refinement option
3. Pass refinement instruction to tuner agent: "Re-generate diffs with refinement: [instruction]"
4. Show updated diffs
5. Repeat steps 2-4 up to 3 times
6. On iteration 3: If user picks "Refine" again, gate: "Max iterations reached. Approve these diffs, or type `--force-override` to continue."

---

### Batch Mode Processing (Multiple Issues)

**Decision Locked: Review-all-then-approve (D-05)**

Workflow for `--batch issues.json`:
```json
[
  { "skill": "gsd-auditor", "symptom": "Timeout on large JSON" },
  { "skill": "gsd-auditor", "symptom": "Unclear error messages" },
  { "skill": "gsd-executor", "symptom": "Missing task retry logic" }
]
```

**Phase for each issue:**

| Step | Implementation |
|------|-----------------|
| 1. Invoke audit for each skill | `gsd-audit-skill {skill}` → collect SKILL-AUDIT.md files |
| 2. Semantic-prioritize findings for each symptom | Rank findings by relevance to reported symptom |
| 3. Generate diffs for each | Propose minimal fixes per issue |
| 4. **Review all diffs together** | Display all proposed changes in one view (not per-issue prompts) |
| 5. Approve/reject in bulk | Single checkbox: "Apply all {N} fixes" or "Apply selected: [checkboxes]" |
| 6. If refinement needed | Apply refinement instruction to ALL remaining issues |
| 7. Commit batch atomically | One commit per batch: `fix(batch): tune {count} issues — {theme}` |

**Efficiency gains:**
- Single batch invocation of auditor (vs. N sequential invocations)
- User sees the full scope before committing to changes
- Refinement applies across issues consistently

---

### Audit Integration

**Entry point to audit workflow:**

```bash
# Step 1: User invokes tuner
/gsd-tune-skill myskill "Agent keeps timing out"

# Step 2: Tuner invokes auditor
gsd-audit-skill myskill  # Produces SKILL-AUDIT.md

# Step 3: Tuner reads SKILL-AUDIT.md findings
# (not raw skill files — audit is the single source of diagnosis)

# Step 4: Semantic prioritization of findings
# Step 5: Propose diffs
# Step 6: User review + refine loop

# Step 7: Approved edits applied + committed

# Step 8: Regression check
gsd-audit-skill myskill --structural-only
```

**Critical: Tuner never touches raw skill files directly.** All analysis goes through audit.

---

## Common Pitfalls & Mitigations

| Pitfall | Risk | Mitigation |
|---------|------|-----------|
| **Semantic analysis timeout** | Batch mode stalls if ranking takes >30s per issue | Profile token usage; cap to N findings per issue (e.g., top 10) |
| **Ambiguous symptom leads to wrong fixes** | User describes "slowness" but means SMART completeness | Hybrid symptom intake — fallback to structured Q&A if confidence <0.65 |
| **User trapped in refinement loop** | Iteration 4+ without explicit override burns tokens | Hard gate at 3; require `--force-override` after |
| **Inline highlighting fails in some runtimes** | Diffs render as garbage in remote SSH, non-TTY contexts | Runtime detection + graceful fallback to plain unified diff |
| **Batch mode changes unrelated findings** | Refinement instruction ("simplify") applied too broadly | Document clearly which findings were changed per refinement request |
| **Post-fix audit misses regressions** | `--structural-only` doesn't catch SMART dimension degradation | Post-fix runs full audit (not just structural) if issues arise; logged for user review |

---

## File Artifacts

### Output from Phase 5

1. **`commands/gsd/tune-skill.md`** — Entry point command for `/gsd-tune-skill`
2. **`get-shit-done/workflows/tune-skill.md`** — Orchestration workflow (8+ steps: intake, audit, prioritize, generate, present, refine loop, approve, commit, verify)
3. **`agents/gsd-skill-tuner.md`** — Agent that generates diffs, handles refinement, and applies edits
4. **`get-shit-done/references/refinement-prompts.md`** (optional) — Taxonomy of refinement instructions for consistent tuner behavior

### Integrations

- Writes to `.planning/phases/{skill-name}/TUNE-{date}.md` — Session log of tuning work
- Commits to main branch with `fix(skill): tune {name} — {summary}`
- Updates ROADMAP.md to track skill quality improvement history

---

## Risks & Unknowns

| Category | Risk | Confidence |
|----------|------|------------|
| **Token cost of semantic analysis** | May exceed budget in batch mode | MEDIUM — Needs profiling |
| **Inline diff rendering across runtimes** | Syntax highlighting may fail in some environments | MEDIUM — Needs testing across Claude Code, Copilot, Gemini CLI |
| **User symptom clarity** | "Slow" or "broken" may be too vague for semantic prioritization | MEDIUM — Mitigated by hybrid structured follow-up |
| **SMART regression detection post-fix** | Structural audit sufficient, or need full audit? | MEDIUM — User decision: `--verify-structural-only` vs. `--verify-full` |
| **Batch refinement scope** | Does refinement apply to all issues or selected subset? | MEDIUM — Design for per-subset selection to avoid over-broad changes |

---

## Recommendations for Planner

1. **Start with command + workflow** — Define UX of symptom intake, review gates, refinement prompts upfront
2. **Agent-first design** — Tuner agent is the core; delegate semantic prioritization to it if possible
3. **Test runtime rendering** — Create quick demo of inline diffs in multiple contexts before implementation
4. **Batch mode phased rollout** — Implement single-skill tuning first, batch mode as follow-up
5. **Audit integration testing** — Ensure tuner reads SKILL-AUDIT.md correctly and handles missing findings gracefully

---

*Research completed: 2026-04-15*
*Confidence level: HIGH for locked decisions, MEDIUM for implementation unknowns (semantic analysis profiling, cross-runtime rendering testing)*
