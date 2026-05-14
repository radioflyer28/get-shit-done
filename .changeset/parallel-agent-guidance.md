---
type: Changed
pr: TBD
---

**Codex GSD skills now preserve intended parallel subagent fan-out** — the Codex skill adapter maps `Agent(..., run_in_background=true)` to `spawn_agent`/`wait_agent([...])` and treats `spawn_agent` as the Agent-compatible capability, so workflows such as `/gsd-map-codebase` do not fall back to inline sequential mapping solely because the Claude Code `Agent` tool name is absent.
