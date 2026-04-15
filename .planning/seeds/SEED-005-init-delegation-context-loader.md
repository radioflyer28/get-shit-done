---
id: SEED-005
status: dormant
planted: 2026-04-14
planted_during: pre-project (no milestone yet)
trigger_when: when token cost reduction or orchestrator latency becomes a priority — or when a milestone explicitly focuses on GSD performance/efficiency
scope: Medium
---

# SEED-005: Init Delegation — Cheap Sub-Agent Handles Skill Bootstrap, Expensive Model Gets Clean Context

## Why This Matters

Every GSD workflow orchestrator — `plan-phase`, `execute-phase`, `new-project`, `discuss-phase`,
etc. — follows the same pattern on startup:

1. Read 3–6 `<required_reading>` reference files into context (ui-brand.md, revision-loop.md,
   gate-prompts.md, agent-contracts.md, gates.md...)
2. Run `gsd-tools.cjs init <skill-name>` and parse 20+ JSON fields
3. Run `agent-skills` for each sub-agent (3–4 bash calls)
4. Run `config-get` for feature flags (2–3 more calls)
5. Read project files: STATE.md, ROADMAP.md, config.json, requirements, phase context...

Only **after** all of this does the orchestrator do anything that actually requires intelligence.

The problem: this init work is **mechanical** — file reads and bash script parsing — but it's
being executed by the **most expensive model** in the chain. For `gsd-plan-phase` at balanced
profile, that's `gsd-planner: opus`. For `gsd-execute-phase`, that's `gsd-executor: opus/sonnet`.
The expensive model burns its early token budget on work a `haiku`-tier agent could do perfectly.

The fix: an **init delegation pattern** — a lightweight `gsd-context-loader` sub-agent (always
`haiku` tier) that handles the full bootstrap: runs bash init, reads all required files, assembles
a structured context packet, and returns it to the orchestrator. The orchestrator receives a clean,
ready-to-act context and skips directly to decision-making.

This mirrors the pre-scan pattern (SEED-006) but applied universally to all skill orchestrators
rather than just the security scanner. The result: the same work, at a fraction of the model cost,
with lower latency (haiku responds faster than opus), and the expensive model's full context window
is preserved for high-value reasoning rather than file loading.

## When to Surface

**Trigger:** When a milestone focuses on GSD token cost reduction, orchestrator performance,
or reducing the cost-per-skill-invocation.

This seed should be presented during `/gsd-new-milestone` when the milestone scope matches:
- Milestone on GSD performance, efficiency, or cost reduction
- Milestone refactoring workflow patterns for consistency (natural moment to add the pattern)
- Milestone following SEED-001 (build-skill scaffolder) — new skills could adopt the pattern from day one if the scaffolder generates it
- Any milestone where "reduce expensive model token use" is a stated goal

## Scope Estimate

**Medium** — One focused phase. The init pattern is cross-cutting but the change per workflow
is small (add one delegation step to each workflow's init section).

**New agent: `gsd-context-loader`** (`model-profiles.cjs` entry: all profiles → `haiku`)

Input: `<init_request>` block specifying:
- `skill_name` — which `gsd-tools.cjs init <skill>` command to run
- `arguments` — forwarded from `$ARGUMENTS`
- `required_reading` — list of `@~/.../` file paths to load inline
- `agent_skills` — list of agent names to resolve via `agent-skills` command
- `config_keys` — list of `config-get` keys to resolve
- `extra_files` — optional additional project files to pre-read (STATE.md, ROADMAP.md, etc.)

Output: structured `<context_packet>` block containing:
- `init_json`: full parsed JSON from `gsd-tools.cjs init`
- `reference_contents`: map of filename → inline content for each required_reading file
- `agent_skills`: map of agent name → skills block
- `config_values`: map of key → value for each config-get
- `project_files`: map of filename → content for pre-read project files
- `computed`: derived values the orchestrator commonly needs (e.g., `TEXT_MODE`, `phase_dir`, `padded_phase`)

**Workflow change: `<init_delegation>` pattern**

In each workflow's initialize step, replace:
```bash
# Currently (expensive model does this):
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init plan-phase "$PHASE")
AGENT_SKILLS_PLANNER=$(node "..." agent-skills gsd-planner)
# ... more bash calls ...
# ... read 5 reference files ...
```

With:
```
Task(prompt="
<init_request>
  skill_name: plan-phase
  arguments: {$ARGUMENTS}
  required_reading: [ui-brand.md, revision-loop.md, gate-prompts.md, agent-contracts.md, gates.md]
  agent_skills: [gsd-phase-researcher, gsd-planner, gsd-plan-checker]
  config_keys: [context_window, workflow.tdd_mode]
  extra_files: [STATE.md, ROADMAP.md, config.json]
</init_request>

Return a <context_packet> block with all resolved values inline.
", subagent_type="gsd-context-loader", model="haiku", description="Load init context")
```

The orchestrator receives the full packet immediately, skips all bash calls, and proceeds to
decision-making with the expensive model's context window reserved for actual orchestration.

**Rollout strategy (important — don't break all skills at once):**

Phase 1: Implement `gsd-context-loader` agent + test with one workflow (recommend `plan-phase`
as it has the most expensive init and is well-tested)

Phase 2: Roll out to other expensive orchestrators: `execute-phase`, `new-project`,
`discuss-phase`, `security-audit`, `threat-scan` (scanner workflows have the same expensive
init pattern — pre-scan tool config, reference file loading, agent skills resolution)

Phase 3: Update `gsd-build-skill` scaffolder (SEED-001) to generate the `<init_delegation>`
pattern by default in new skills

**`gsd-tools.cjs` enhancement: `init --bundle` flag**

To make the context-loader's job easier, add `--bundle` flag to all `gsd-tools.cjs init` commands:
```bash
node gsd-tools.cjs init plan-phase 3 --bundle
```
Returns a single JSON object that already includes resolved file paths expanded to content
(instead of returning `@file:` references that require a second read). The context-loader calls
this once instead of making N separate file reads. Reduces sub-agent tool calls from 10+ to 2-3.

## Breadcrumbs

Related code and decisions found in the current codebase:

- `get-shit-done/workflows/plan-phase.md` lines 25–42 — the init section this pattern would replace; 7 separate bash calls + 5 required_reading files = 12+ tool calls at opus tier
- `get-shit-done/workflows/execute-phase.md` lines 66–100 — same pattern: `init execute-phase`, `agent-skills gsd-executor`, `config-get workflow.use_worktrees`, `config-get context_window`
- `get-shit-done/workflows/new-project.md` — most expensive: 1200+ line workflow, longest init, most config reads
- `get-shit-done/workflows/discuss-phase.md` — also long; init section similar structure
- `get-shit-done/bin/lib/model-profiles.cjs` — `gsd-planner: { balanced: 'opus' }`, `gsd-executor: { balanced: 'sonnet' }` — these are the models currently handling init; haiku is already available as a tier
- `get-shit-done/bin/gsd-tools.cjs` — the `init` subcommand that would gain the `--bundle` flag; already returns `@file:` references for large payloads (the mechanism is there, just needs bundling)
- `agents/gsd-codebase-mapper.md` — precedent: `{ balanced: 'haiku' }` already in model-profiles; shows pattern for "structural/mechanical agents get haiku"
- `.planning/seeds/SEED-006-security-prescan-orchestrator.md` — parallel pattern in security scanner: offload mechanical work to deterministic tools before expensive agent starts
- `.planning/seeds/SEED-001-build-skill-scaffolder.md` — future skills would adopt `<init_delegation>` pattern from scaffold if SEED-001 lands first

## Notes

**Quantitative estimate (rough):**

For `plan-phase` at balanced profile (opus):
- Current init: ~15,000 tokens consumed reading files + processing bash before any planning starts
- With delegation: ~3,000 tokens in context-loader (haiku) for the same work; orchestrator receives
  clean packet, starts planning immediately
- Cost difference per invocation: ~$0.08–$0.15 saved at current opus pricing, depending on reference file sizes

Across 10 skill invocations/day for an active GSD user: $0.80–$1.50/day pure init savings,
plus the qualitative benefit of the expensive model's context window not being polluted with
file contents the model will never actively reason about.

**Design constraint:** The context-loader must be pure read + compute — no file writes, no
state changes. It's a "read amplifier" not an orchestrator. If it fails, the workflow falls
back to inline init (the current behavior) via a try/catch wrapper in the workflow.

**Cross-platform consideration:** The `<init_delegation>` Task() call must work on all GSD
platforms. On platforms that don't support subagent spawning (some Codex environments), the
workflow must fall back to inline init. The `gsd-tools.cjs init --bundle` flag provides an
alternative path that doesn't require subagent support — just one bash call instead of many.

**`/gsd-settings` integration:** Init delegation should be a configurable toggle exposed in
`/gsd-settings`, since it changes observable behavior (adds a visible sub-agent spawn step
before the main orchestrator starts). Proposed settings:

```json
// ~/.gsd/defaults.json
{
  "workflow": {
    "init_delegation": true,           // default: true once stable; false = inline init (legacy behavior)
    "init_delegation_model": "haiku"   // default: "haiku"; accepts any model ID available in the user's coding agent
  }
}
```

`/gsd-settings` would display this as:
- **Init Delegation** — Use a lightweight sub-agent to load skill context before the main
  orchestrator starts. Reduces expensive model token use during skill bootstrap.
  `[Enabled] / Disabled`
- **Init Delegation Model** — Model ID used for the context-loader sub-agent. Accepts any
  model ID supported by your coding agent (e.g., `haiku`, `claude-haiku-4-5`,
  `gpt-4o-mini`, `gemini-2.0-flash`). Default: `haiku` (resolved via GSD model tier mapping).
  `[haiku]` *(freeform input)*

The value is passed directly as the `model=` parameter in the delegation `Task()` call.
GSD tier names (`haiku`, `sonnet`, `opus`) are resolved through the normal model-profiles
mapping for the active platform; raw model IDs are passed through verbatim, letting users
target specific versions (e.g., `claude-haiku-4-5` to pin to a known-cheap version even
as defaults change).

When `init_delegation: false`, workflows fall back to the current inline init — useful for
debugging, platforms where sub-agent spawning adds latency rather than saving it, or during
rollout when users want to opt out conservatively. The model setting is persisted even when
delegation is disabled so it's remembered when re-enabled. Both flags should be checkable
via `gsd-tools.cjs init --check-delegation` (returns `{ enabled: bool, model: string }`)
so workflows can gate and configure the delegation Task() call in a single call.
