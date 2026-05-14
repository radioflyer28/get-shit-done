---
type: Added
pr: 3475
---
**Codex workflows can use parallel subagents after explicit authorization** — the Codex adapter now translates GSD `Agent()` / `Task()` fan-out to `spawn_agent` / `wait_agent`, prompts before spawning when needed, and keeps sequential fallback for declined or unavailable subagents.
