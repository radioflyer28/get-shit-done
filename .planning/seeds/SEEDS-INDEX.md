# Seeds Index — Dependency Graph & Ordering

## Skill Lifecycle Group (SEED-001 → 004)

```
SEED-001 (create) → SEED-003 (audit) → SEED-002 (tune) → SEED-004 (evolve)
```

| Seed | Name | Depends On | Enables |
|------|------|-----------|---------|
| SEED-001 | Build skill scaffolder | — | SEED-003, SEED-002 |
| SEED-002 | Tune skill (human loop) | SEED-003 | SEED-004 |
| SEED-003 | Skill auditor | — (benefits from SEED-001) | SEED-002, SEED-004 |
| SEED-004 | Autoresearch skill loop | SEED-002, SEED-003 | — |

**Shared artifact:** `references/skill-smart-criteria.md` — consumed by SEED-001, 002, 003, 004.
Ships with whichever seed lands first (SEED-001 creates minimal version; SEED-003 expands it).

**Shared agent:** `gsd-skill-tuner` — used by both SEED-002 (interactive) and SEED-004 (autonomous).

## Infrastructure (SEED-005)

| Seed | Name | Depends On | Enables |
|------|------|-----------|---------|
| SEED-005 | Init delegation | — | All skills (cost reduction) |

Independent of both groups. Can pair with SEED-001 (scaffolder generates init delegation pattern).

## Scanner Group (SEED-006 → 010)

```
SEED-006 (orchestrator) → SEED-007 (OWASP patterns) + SEED-008 (threat patterns) → SEED-009 (git forensics) → SEED-010 (operational)
```

| Seed | Name | Depends On | Enables |
|------|------|-----------|---------|
| SEED-006 | Pre-scan orchestrator | — | SEED-007, SEED-008, SEED-009, SEED-010 |
| SEED-007 | Security reference sub-skills | — (benefits from SEED-006) | SEED-010 |
| SEED-008 | Adversarial pattern library | — (benefits from SEED-006) | SEED-010 |
| SEED-009 | Git forensics agent | — (benefits from SEED-006, SEED-008) | SEED-010 |
| SEED-010 | Scanner operational excellence | SEED-006 (Phase C) | — |

**Canonical definitions in SEED-006:** Scanner purpose framing, web search mechanism, depth gating.
Other scanner seeds reference SEED-006 Notes rather than repeating these definitions.

**Layer boundary:** SEED-006 runs locally installed CLI tools. SEED-010 Phase B queries remote APIs.
