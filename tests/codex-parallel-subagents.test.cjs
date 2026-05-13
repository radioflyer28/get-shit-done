// allow-test-rule: source-text-is-product

/**
 * Regression coverage for Codex subagent parallelism in GSD workflows.
 *
 * Codex does support subagents through spawn_agent/wait_agent, but GSD must
 * only use them when the user explicitly authorizes subagents for the current
 * skill invocation. Older workflow text treated Codex as inherently
 * sequential, which blocked map-codebase/docs-update parallelism.
 */

'use strict';

process.env.GSD_TEST_MODE = '1';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const MAP_CODEBASE = path.join(ROOT, 'get-shit-done', 'workflows', 'map-codebase.md');
const DOCS_UPDATE = path.join(ROOT, 'get-shit-done', 'workflows', 'docs-update.md');
const MAP_COMMAND = path.join(ROOT, 'commands', 'gsd', 'map-codebase.md');
const { getCodexSkillAdapterHeader } = require('../bin/install.js');

describe('Codex parallel subagent adapter', () => {
  test('central adapter maps Agent and Task background work to spawn_agent/wait_agent', () => {
    const header = getCodexSkillAdapterHeader('gsd-map-codebase');

    assert.match(header, /Task\(\)\/Agent\(\) → spawn_agent/);
    assert.match(header, /Task\(subagent_type="X", prompt="Y"\).*spawn_agent\(agent_type="X", message="Y"\)/s);
    assert.match(header, /Agent\(subagent_type="X", prompt="Y"\).*spawn_agent\(agent_type="X", message="Y"\)/s);
    assert.match(header, /run_in_background=true.*wait_agent\(\[\.\.\.\]\)/s);
    assert.match(header, /--parallel/);
    assert.match(header, /use parallel subagents/);
  });
});

describe('map-codebase Codex parallel workflow', () => {
  test('documents --parallel as explicit Codex spawn_agent authorization', () => {
    const workflow = fs.readFileSync(MAP_CODEBASE, 'utf8');

    assert.match(workflow, /<step name="parse_codex_parallel_flag"/);
    assert.match(workflow, /CODEX_PARALLEL_REQUESTED=true/);
    assert.match(workflow, /Codex spawn_agent and wait_agent are available AND explicit --parallel authorization/);
    assert.match(workflow, /spawn_agent\(/);
    assert.match(workflow, /wait_agent\(\[tech_agent_id, arch_agent_id, quality_agent_id, concerns_agent_id\]\)/);
  });

  test('does not classify Codex as inherently Agent-unavailable', () => {
    const workflow = fs.readFileSync(MAP_CODEBASE, 'utf8');

    assert.doesNotMatch(workflow, /Agent tool is NOT available \(e\.g\.[^)]*Codex/);
    assert.doesNotMatch(workflow, /Gemini CLI, Codex/);
    assert.match(workflow, /not explicitly authorized for Codex/);
  });

  test('command frontmatter advertises --parallel', () => {
    const command = fs.readFileSync(MAP_COMMAND, 'utf8');

    assert.match(command, /argument-hint: "\[--parallel\]/);
    assert.match(command, /Explicitly authorizes Codex to use `spawn_agent` \/ `wait_agent`/);
  });
});

describe('docs-update Codex parallel workflow', () => {
  test('keeps Codex sequential fallback only when subagents are not explicitly authorized', () => {
    const workflow = fs.readFileSync(DOCS_UPDATE, 'utf8');

    assert.doesNotMatch(workflow, /Task tool is NOT available \(e\.g\.[^)]*Codex/);
    assert.match(workflow, /Codex subagents were not explicitly authorized/);
    assert.match(workflow, /Codex `spawn_agent` exists but the user did not explicitly request subagents/);
  });
});
