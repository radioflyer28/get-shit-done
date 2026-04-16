# Phase 4: Skill Scaffolder — Discussion Context

**Status:** Context complete  
**Date:** 2025-07-14  
**Phase goal:** Users can run `/gsd-build-skill` and get a complete, convention-compliant skill scaffold generated from their description — command file, workflow, and optional agent, all populated with working content (not just stubs).

---

## Gray Areas Resolved

### D-01 — Interaction flow / mode selection

**Decision:** The scaffolder always attempts **full auto-generation** from the user's name + description + type. There is no separate guided mode or `--guided` flag.

- If the description is clear and the skill type is unambiguous → generate immediately, no extra questions
- If there is genuine ambiguity (unclear scope, conflicting signals, missing critical details) → ask targeted clarifying questions before generating
- `--template` flag is the opt-out: produces bare skeleton stubs with `TODO:` markers instead of generated content

Adaptive questioning is not a separate mode — it is simply how auto-generation handles ambiguity.

**Rationale:** "Guided" and "auto/full" were the same concept described twice. The scaffolder's job is always to generate a complete skill; the only variable is whether it needs to ask clarifying questions first. Keeping a single mode eliminates a confusing flag and a false choice.

---

### D-02 — Skill type → file mapping

**Decision:** Each skill type has a canonical file set:

| Type | command | workflow | agent |
|------|---------|----------|-------|
| orchestrator | ✅ | ✅ | ✅ |
| standalone | ✅ | ✅ | ❌ |
| hybrid | ✅ | ✅ | ✅ (always) |
| informational | ✅ | ✅ | ❌ |

- **orchestrator**: spawns subagents — needs `commands/gsd/{name}.md`, `get-shit-done/workflows/{name}.md`, `agents/gsd-{name}.md`
- **standalone**: self-contained — needs command + workflow only
- **hybrid**: sometimes uses agents — generates all three files (see D-03)
- **informational**: reference/guidance content — needs command + workflow only

The `get-shit-done/references/{name}*.md` file is always optional and only generated if the user explicitly requests reference docs.

**Rationale:** Type classification drives the file set, reducing scaffolding errors and over-generation.

---

### D-03 — Hybrid agent file generation

**Decision:** For `hybrid` type, the agent file is **always generated** — the user can delete it if they decide they don't need it.

**Rationale:** Hybrid implies the potential to use agents; generating the file up front is less friction than discovering the need later and having to re-scaffold.

---

### D-04 — Agent reuse surface (SCAFFOLD-02)

**Decision:** Before generating a new agent file (orchestrator or hybrid types), the scaffolder:

1. Reads only the **frontmatter/metadata block** at the top of each `agents/gsd-*.md` file (not the full content — keeps context cost low)
2. Keyword-matches the user's description against agent names and metadata descriptions
3. Surfaces any close matches with a brief note: "These existing agents may overlap — consider reusing them before generating a new one"
4. User confirms to proceed with new agent generation, or picks an existing agent to reference

This check is **skipped for standalone and informational types** where no agent file will be generated.

**Rationale:** Frontmatter-only scanning keeps the operation fast and context-light. The check is gated on type to avoid unnecessary work.

---

### D-05 — Auto-generative output (covers ECO-02)

**Decision:** Consolidated into D-01. The scaffolder is fully auto-generative by default. ECO-02 is covered. `--template` is the opt-out for bare stubs.

---

## Inherited Decisions (from prior phases)

- **Soft-warning pattern (Phase 3 D-05):** When a downstream tool is unavailable (e.g., `/gsd-audit-skill` for SCAFFOLD-05), print a soft warning to stderr — never fail hard. Proceed with inline structural fallback checks.
- **Platform compatibility matrix (Phase 1 INFRA-03):** Generated files must respect tool permissions defined in `references/skill-authoring.md` — no platform-incompatible tool calls in scaffolded content.
- **Structural checks (Phase 2):** Generated files are validated against the same structural checks the auditor uses (required tags, path resolution, no hardcoded `~/.claude/` paths, no heredoc patterns).

---

## Files to Create in Phase 4

| File | Purpose |
|------|---------|
| `commands/gsd/build-skill.md` | New `/gsd-build-skill` command |
| `get-shit-done/workflows/build-skill.md` | Scaffolder workflow |
| `agents/gsd-skill-scaffolder.md` | Scaffolder agent |

---

## Open Questions (for planning)

- What is the exact set of SMART-compliant patterns to inject into generated files by type? (e.g., what does a well-formed orchestrator `<process>` stub look like vs. a standalone one?)
- Should the scaffolder register the generated skill in any index or manifest (beyond SCAFFOLD-06 registration prompts)?
- Should `--template` accept a type argument (e.g., `--template orchestrator`) to produce type-specific stubs without the full generation step?
