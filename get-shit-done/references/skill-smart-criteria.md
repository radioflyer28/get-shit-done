# Skill SMART Criteria

> This rubric is the single source of truth for GSD skill quality evaluation.
> It is read by the auditor (Phase 2), scaffolder (Phase 4), and tuner (Phase 5).
> Do not duplicate these definitions elsewhere.

## Purpose

This rubric scores GSD skills 1–5 on five dimensions adapted from the SMART framework. A score of 5 means production-ready; 1 means needs major rework. All downstream skill lifecycle tools (auditor, scaffolder, tuner) share this definition of quality.

## How to Use This Rubric

- Score each dimension independently. The dimensions do not combine into a single number.
- Any dimension scored ≤ 2 is a FAIL, regardless of scores on other dimensions.
- Cite evidence for each score — quote the line or section that justifies it.
- This rubric is read by AI agents. Use concrete, checkable conditions in all descriptions.

## Scoring Scale

| Score | Meaning | Disposition |
|-------|---------|-------------|
| 1 | Absent or critically broken | FAIL |
| 2 | Incomplete — core element missing | FAIL |
| 3 | Functional with notable gaps | PASS WITH WARNINGS |
| 4 | Good — minor issues only | PASS |
| 5 | Exemplary — complete and precise | PASS |

## Dimensions

### S — Specific

**Definition:** The skill's objective and steps specify *what*, *how*, and *under what conditions* — no ambiguous verbs.

| Sub-criterion | 1 (Absent) | 3 (Partial) | 5 (Full) |
|--------------|-----------|-------------|---------|
| **Objective clarity** | Objective is a vague goal ("help with X") | Objective states output but not conditions | Objective states exact output, trigger conditions, and success state |
| **Step specificity** | Steps use open-ended verbs ("handle", "manage", "deal with") | Steps name the action but not the target or tool | Steps name action, target file/resource, and tool to use |
| **Scope boundary** | No indication of what is out of scope | Partial scope (happy path only) | Explicit scope boundaries: what the skill does AND does not do |
| **Argument handling** | `$ARGUMENTS` used but never parsed or explained | Arguments partially documented in context | All accepted arguments documented with semantics and defaults |

<!-- Phase 2: add good/bad examples from real skill audits here -->

### M — Measurable

**Definition:** Completion is detectable without human judgment — observable outputs, file changes, or terminal markers.

| Sub-criterion | 1 (Absent) | 3 (Partial) | 5 (Full) |
|--------------|-----------|-------------|---------|
| **Completion signal** | No output or marker defined | Output described loosely ("report results") | Exact completion marker or output format specified (e.g., `## DONE`, file written) |
| **Observable outputs** | No files, artifacts, or state changes listed | Some outputs mentioned but not all | All created/modified files/artifacts enumerated |
| **Verification steps** | No way to check success | Check is subjective ("looks right") | Concrete check: file exists, content matches pattern, command returns 0 |
| **Failure signal** | Silent failure possible | Error mentioned but not how to detect | Failure path has explicit signal or message format |

<!-- Phase 2: add good/bad examples from real skill audits here -->

### A — Achievable

**Definition:** Every tool used is permitted by `allowed-tools`; every referenced file/path actually exists at runtime; no steps require capabilities beyond the AI platform.

| Sub-criterion | 1 (Absent) | 3 (Partial) | 5 (Full) |
|--------------|-----------|-------------|---------|
| **Tool permission alignment** | Steps call tools not in `allowed-tools` | All tools listed but some not used (over-declared) | `allowed-tools` matches exactly what the skill uses |
| **Path existence** | `<execution_context>` paths reference non-existent files | Paths exist but use hardcoded user-specific paths | Paths use runtime-appropriate `~/.copilot/` pattern and resolve correctly |
| **Platform feasibility** | Steps require platform-specific behavior without runtime note | Platform differences noted but no fallback | `<runtime_note>` provides fallback for each platform-incompatible step |
| **Scope realism** | Steps require sub-agent spawning but `Task` not in `allowed-tools` | Task in tools but spawn pattern is incomplete | Agent spawn pattern complete: tool listed, agent named, output handling specified |

<!-- Phase 2: add good/bad examples from real skill audits here -->

### R — Relevant

**Definition:** Every step and section serves the stated objective — no dead weight, no scope creep, no context that belongs elsewhere.

| Sub-criterion | 1 (Absent) | 3 (Partial) | 5 (Full) |
|--------------|-----------|-------------|---------|
| **Objective coherence** | Steps don't map to the stated objective | Most steps serve objective; 1-2 are tangential | Every step has a traceable line to the objective |
| **Context relevance** | `<context>` section contains info not used by any step | Most context used; some noise | All context in `<context>` is consumed by at least one step |
| **Execution context fit** | `<execution_context>` loads files irrelevant to skill function | Relevant files loaded plus 1-2 extras | Exactly the files needed — no more, no less |
| **No scope bleed** | Skill does work belonging to a different skill/agent | Minor overlap with adjacent skill | Clean boundary: skill delegates out-of-scope work rather than implementing it |

<!-- Phase 2: add good/bad examples from real skill audits here -->

### T — Time-bound

**Definition:** The skill has defined execution bounds — steps are finite, loops have exit conditions, and the skill terminates without external intervention under normal conditions.

| Sub-criterion | 1 (Absent) | 3 (Partial) | 5 (Full) |
|--------------|-----------|-------------|---------|
| **Step count bounds** | Process has unbounded iteration ("keep trying until done") | Bounded iteration mentioned but not enforced | Explicit max iterations or termination condition per loop |
| **Blocking gate handling** | Skill can hang waiting for user input without timeout | User gate present but no "if no response" path | All `AskUserQuestion` gates have a documented default or timeout path |
| **Phase scope** | Skill could expand indefinitely based on what it finds | Scope creep possible but unlikely | Skill stops at phase boundary regardless of remaining work discovered |
| **Checkpoint clarity** | No indication of when to pause vs proceed | Pause points mentioned but trigger unclear | Each checkpoint has explicit trigger condition and resume instruction |

<!-- Phase 2: add good/bad examples from real skill audits here -->

## Scoring Summary Table

| Dimension | Definition summary | Key question to ask | FAIL threshold |
|-----------|--------------------|---------------------|----------------|
| **S — Specific** | Objective and steps specify what, how, and under what conditions | Can an agent execute this without guessing intent? | Score ≤ 2 |
| **M — Measurable** | Completion is detectable without human judgment | Is there a concrete, observable signal when the skill finishes? | Score ≤ 2 |
| **A — Achievable** | All tools permitted; all paths exist; no capability overreach | Can this skill actually run on the target platform as written? | Score ≤ 2 |
| **R — Relevant** | Every step serves the stated objective; no dead weight | Does every section and step have a traceable line to the goal? | Score ≤ 2 |
| **T — Time-bound** | Execution bounds are defined; loops have exit conditions | Will this skill always terminate without external intervention? | Score ≤ 2 |
