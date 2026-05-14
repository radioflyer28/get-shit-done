// allow-test-rule: source-text-is-the-product

/**
 * Regression coverage for Codex subagent parallelism in GSD workflows.
 *
 * Runtime-specific Codex rules belong in the installed Codex adapter. Workflow
 * prose should keep using the canonical GSD Agent()/Task() fan-out contract so
 * every runtime can provide its own adapter without skill-specific branches.
 */

'use strict';

process.env.GSD_TEST_MODE = '1';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const WORKFLOWS_DIR = path.join(ROOT, 'get-shit-done', 'workflows');
const MAP_CODEBASE = path.join(ROOT, 'get-shit-done', 'workflows', 'map-codebase.md');
const DOCS_UPDATE = path.join(ROOT, 'get-shit-done', 'workflows', 'docs-update.md');
const MAP_COMMAND = path.join(ROOT, 'commands', 'gsd', 'map-codebase.md');
const { getCodexSkillAdapterHeader } = require('../bin/install.js');

function listMarkdownFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.md') ? [fullPath] : [];
  });
}

function relativeWorkflowPath(filePath) {
  return path.relative(WORKFLOWS_DIR, filePath).replaceAll(path.sep, '/');
}

describe('Codex parallel subagent adapter', () => {
  test('central adapter maps Agent and Task background work to spawn_agent/wait_agent', () => {
    const header = getCodexSkillAdapterHeader('gsd-map-codebase');

    assert.match(header, /Task\(\)\/Agent\(\) → spawn_agent/);
    assert.match(header, /Task\(subagent_type="X", prompt="Y"\).*spawn_agent\(agent_type="X", message="Y"\)/s);
    assert.match(header, /Agent\(subagent_type="X", prompt="Y"\).*spawn_agent\(agent_type="X", message="Y"\)/s);
    assert.match(header, /run_in_background=true.*wait_agent\(\[\.\.\.\]\)/s);
    assert.match(header, /Task\(model="\.\.\."\)` \/ `Agent\(model="\.\.\."\)` → pass `model="\.\.\."` to `spawn_agent`/);
  });

  test('authorization prompting is adapter-level and not flag-specific', () => {
    const header = getCodexSkillAdapterHeader('gsd-map-codebase');

    assert.match(header, /user phrases like "use parallel subagents" \/ "spawn subagents"/);
    assert.match(header, /affirmative answer to an adapter prompt/);
    assert.match(header, /proactively ask whether to use\s+parallel subagents/s);
    assert.match(header, /Do not spawn until the user confirms/);
    assert.match(header, /treat Codex `spawn_agent` \/ `wait_agent` as satisfying that\s+subagent-delegation requirement/s);
    assert.match(header, /Do not classify Codex as\s+sequential solely because it lacks Claude's literal `Task` or `Agent` tool/s);
    assert.doesNotMatch(header, /--parallel/);
    assert.doesNotMatch(header, /--no-parallel/);
  });

  test('adapter contract covers every workflow with background Agent fan-out', () => {
    const header = getCodexSkillAdapterHeader('gsd-generic-workflow');
    const backgroundAgentWorkflows = listMarkdownFiles(WORKFLOWS_DIR)
      .map((filePath) => ({ filePath, text: fs.readFileSync(filePath, 'utf8') }))
      .filter(({ text }) => /Agent\(/.test(text) && /run_in_background\s*[:=]\s*true/.test(text));

    assert.ok(
      backgroundAgentWorkflows.length >= 1,
      'expected at least one workflow to declare Agent(..., run_in_background=true)',
    );
    assert.match(header, /Agent\(subagent_type="X", prompt="Y"\).*spawn_agent\(agent_type="X", message="Y"\)/s);
    assert.match(header, /run_in_background=true.*wait_agent\(\[\.\.\.\]\)/s);
    assert.match(header, /Task\(model="\.\.\."\)` \/ `Agent\(model="\.\.\."\)` → pass `model="\.\.\."` to `spawn_agent`/);
    assert.match(header, /proactively ask whether to use\s+parallel subagents/s);
    assert.match(header, /Do not spawn until the user confirms/);

    for (const { filePath, text } of backgroundAgentWorkflows) {
      const workflow = relativeWorkflowPath(filePath);
      assert.match(text, /Agent\(/, `${workflow} should use the canonical GSD Agent() contract`);
      assert.match(
        text,
        /run_in_background\s*[:=]\s*true/,
        `${workflow} should mark background fan-out with run_in_background=true`,
      );
    }
  });
});

describe('map-codebase workflow remains runtime-neutral', () => {
  test('command frontmatter does not add Codex-only parallel flags', () => {
    const command = fs.readFileSync(MAP_COMMAND, 'utf8');

    assert.doesNotMatch(command, /--parallel/);
    assert.doesNotMatch(command, /--no-parallel/);
  });

  test('workflow keeps generic Agent fan-out and adapter-equivalent detection', () => {
    const workflow = fs.readFileSync(MAP_CODEBASE, 'utf8');

    assert.match(workflow, /Agent\(\s*subagent_type="gsd-codebase-mapper"/s);
    assert.match(workflow, /run_in_background=true/);
    assert.match(workflow, /equivalent subagent tool provided by the active runtime adapter/);
    assert.match(workflow, /Subagent delegation is NOT available/);
    assert.doesNotMatch(workflow, /parse_codex_parallel_flag/);
    assert.doesNotMatch(workflow, /codex_parallel_prompt/);
    assert.doesNotMatch(workflow, /codex_spawn_agents/);
    assert.doesNotMatch(workflow, /CODEX_PARALLEL_/);
    assert.doesNotMatch(workflow, /CODEX RUNTIME/);
    assert.doesNotMatch(workflow, /Agent tool is NOT available \(e\.g\.[^)]*Codex/);
  });
});

describe('docs-update workflow remains runtime-neutral', () => {
  test('parallel waves use generic Agent fan-out with adapter fallback', () => {
    const workflow = fs.readFileSync(DOCS_UPDATE, 'utf8');

    assert.match(workflow, /Agent\(\s*subagent_type="gsd-doc-writer"/s);
    assert.match(workflow, /run_in_background=true/);
    assert.match(workflow, /active runtime adapter cannot use subagents/);
    assert.doesNotMatch(workflow, /codex_parallel_prompt/);
    assert.doesNotMatch(workflow, /--parallel/);
    assert.doesNotMatch(workflow, /--no-parallel/);
    assert.doesNotMatch(workflow, /CODEX RUNTIME/);
    assert.doesNotMatch(workflow, /Codex `spawn_agent` exists but/);
  });
});
