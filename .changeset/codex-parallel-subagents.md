---
type: Added
pr: 3475
---
**Codex workflows can use parallel subagents after explicit authorization** — `gsd-map-codebase` and docs-update guidance now use Codex `spawn_agent` / `wait_agent` when requested, prompt before spawning when needed, and keep sequential fallback for declined or unavailable subagents.
