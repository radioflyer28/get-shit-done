---
id: SEED-008
status: dormant
planted: 2026-04-14
planted_during: pre-project (no milestone yet)
trigger_when: when SEED-007 (manual tuning) is operational and skill quality metrics become important enough to warrant autonomous improvement — likely when GSD has an active user base generating enough session data to learn from
scope: Large
---

# SEED-008: Autonomous Skill Tuning Loop — Karpathy Autoresearch for GSD Skills

## Why This Matters

In Karpathy's autoresearch, an agent modifies `train.py`, trains for 5 minutes, checks whether
`val_bpb` improved, keeps or discards the change, and repeats overnight. You wake up to a log
of experiments and a better model.

The same loop applies to GSD skills:

- **The program:** `SKILL.md` + `workflow.md` — the "code" the agent modifies
- **The training run:** a GSD skill execution — an agent using the skill to complete a real task
- **The metric:** *skill friction score* — number of user corrections, agent re-tries, deviation
  from the expected workflow path, task completion rate per session
- **The loop:** observe usage → identify friction → propose minimal edit → apply → observe again

The difference from pure autoML is that GSD skills involve human intent — we can't fully
automate approval without risking instruction drift. The autoresearch loop here is:

1. **Observe passively:** A `gsd-skill-observer` sub-agent reads session transcripts/debug logs
   where a specific skill was used, extracts friction signals
2. **Diagnose autonomously:** Same analysis as `gsd-skill-tuner` (SEED-007) — classify failure
   type, locate the instruction responsible
3. **Propose:** Generate a candidate edit, scored by confidence
4. **Human gate (configurable):** At high confidence (≥0.85), auto-apply to a `skill-tuning`
   branch. At lower confidence, surface to human via `/gsd-tune-skill --review` for approval
5. **Measure:** After N sessions using the edited skill, compare friction score before/after
6. **Keep or revert:** If friction decreased → commit. If not → revert and add to "known
   non-improvements" log (prevents re-trying the same fix)

This loop makes skill quality a first-class, self-improving property of GSD — not something
that degrades silently as models and platforms evolve.

## When to Surface

**Trigger:** When SEED-007 (manual tuning) is operational and GSD has enough session volume
to generate meaningful signal — likely when GSD reaches community adoption scale or when an
internal team is using GSD heavily enough that skill friction is measurable.

This seed should be presented during `/gsd-new-milestone` when the milestone scope matches:
- Milestone explicitly focused on "self-improving GSD" or AI-assisted skill optimization
- Milestone following completion of SEED-007 (manual tuning baseline established — now automate)
- Milestone where GSD session volume is high enough to make friction scoring meaningful
- Milestone exploring meta-learning or AI-assisted AI tooling development

## Scope Estimate

**Large** — This is a full milestone. Multiple phases:

**Phase A: Signal Collection Infrastructure**
- `gsd-skill-observer` agent: reads VS Code Copilot debug logs (transcript JSONL files at
  `~/.../workspaceStorage/.../GitHub.copilot-chat/debug-logs/`) or Claude session logs
- Extracts skill usage events: which skill, which step, what happened, did user correct/retry
- Normalizes into `SkillFrictionEvent` records: `{ skill, step, friction_type, severity, session_id, timestamp }`
- Friction signal taxonomy:
  - `user_correction` — user explicitly corrected agent output
  - `step_retry` — same step executed >1 time in one session
  - `workflow_deviation` — agent skipped or reordered steps
  - `task_incomplete` — skill invoked but goal not achieved
  - `platform_fallback` — skill fell back to alternate behavior (signals primary path failed)
- Writes to `.planning/skill-metrics/SKILL-NAME-friction.jsonl` (append-only log)
- `gsd-tools.cjs skill-metrics show <skill>` — aggregate friction score per skill per step

**Phase B: Autonomous Diagnosis and Proposal**
- `gsd-skill-improver` agent: reads friction log + skill files, generates candidate edits
- Same failure type classification as SEED-007's `gsd-skill-tuner`
- Confidence scoring: how certain is the agent that this edit will reduce friction?
  - 0.9+: Apply automatically to `skill-tuning` branch
  - 0.7-0.9: Surface to human via SEED-007 tuning flow (human-gated)
  - <0.7: Log as "needs investigation" — requires human analysis first
- One edit per session (like autoresearch's one-experiment-at-a-time discipline)
- "Known non-improvements" log: prevents retrying edits that didn't help

**Phase C: Measurement and Keep/Revert Loop**
- After N sessions (configurable, default: 10) using the edited skill, compare:
  - Baseline friction score (pre-edit) vs current score (post-edit)
  - If improved by ≥10%: commit to main
  - If unchanged or worse: revert, record in non-improvements log
- `gsd-tools.cjs skill-metrics diff <skill> --before <commit> --after HEAD` — shows score delta
- `skill-tuning` branch accumulates accepted improvements, periodically merged to main

**Phase D: Human-Readable Experiment Log**
- `.planning/skill-metrics/EXPERIMENTS.md` — autoresearch-style log:
  - Each row: edit attempted, metric before/after, keep/revert decision, date
  - Equivalent to autoresearch's `results.tsv`
- Weekly summary command: `gsd-tools.cjs skill-metrics weekly-summary` → markdown report
- `/gsd-skill-metrics` slash command: shows current friction scores for all skills ranked by pain

**`program.md` analog: `references/skill-improvement-program.md`**
The autoresearch loop is parameterized by its `program.md`. GSD's equivalent:
- Defines which friction signals matter most
- Sets confidence thresholds for auto-apply vs human-gate
- Specifies which skills are in-scope for autonomous improvement (not all skills should be)
- Is itself editable by the human to tune the tuner — the meta-loop Karpathy describes

## Breadcrumbs

Related code and decisions found in the current codebase:

- `hooks/gsd-context-monitor.js` — existing hook that monitors context; skill observer follows similar pattern
- `hooks/gsd-workflow-guard.js` — existing workflow guard; friction detection builds on workflow state tracking
- `hooks/gsd-session-state.sh` — session state tracking; friction events need a session boundary concept
- `c:\Users\akriz\AppData\Roaming\Code - Insiders\User\workspaceStorage\...\GitHub.copilot-chat\debug-logs\` — VS Code Copilot stores session transcripts here (used in this very conversation); this is where the skill observer reads from
- `.planning/seeds/SEED-006-build-skill-scaffolder.md` — SEED-006 produces skills; SEED-008 improves them
- `.planning/seeds/SEED-007-tune-skill-human-loop.md` — SEED-007 is the human-gated version; SEED-008 automates the loop with human gates only at low confidence
- `get-shit-done/workflows/` — all workflows that would be observed and potentially auto-improved
- `get-shit-done/bin/gsd-tools.cjs` — `skill-metrics` subcommands would be added here

## Notes

The Karpathy autoresearch analogy is precise:

| autoresearch | GSD skill loop |
|---|---|
| `train.py` | `workflow.md` (the "code" being improved) |
| `program.md` | `skill-improvement-program.md` (meta-instructions for the loop) |
| `val_bpb` | friction score (lower is better) |
| 5-minute train budget | N-session observation window |
| Keep/discard decision | Commit/revert decision |
| Overnight experiment log | `EXPERIMENTS.md` |
| Human programs `program.md` | Human tunes `skill-improvement-program.md` |

Key design tension: how much autonomy to give the loop? Karpathy disables all permissions —
the agent only modifies `train.py`. GSD analog: the skill improver can only modify
`workflow.md` files (not agents, not install scripts, not test files). Scope constraint is
safety constraint.

Session volume requirement: autoresearch needs ~12 experiments/hour to be useful overnight.
GSD needs ~10 sessions per skill to get a reliable friction score. This means SEED-008 is only
meaningful once there's real usage data — hence the "community adoption" trigger condition.
Start with SEED-007 (manual tuning) to establish the classification rubric and tooling before
automating the loop.

The `skill-improvement-program.md` is the most interesting design artifact: it encodes the
*meta-strategy* for skill improvement. Iterating on it (which skills to prioritize, which friction
signals matter, when to auto-apply vs human-gate) is itself a form of autoresearch at the skill
ecosystem level.
