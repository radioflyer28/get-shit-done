process.env.GSD_TEST_MODE = '1';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  getPiSubagentsSkillAdapterHeader,
  injectPiSubagentsSkillAdapter,
  convertClaudeAgentToPiSubagentAgent,
} = require('../bin/install.js');

describe('Pi subagent orchestration parity adapter', () => {
  test('documents exact pi-subagents mappings for single, parallel, chain, async, worktree, and status flows', () => {
    const adapter = getPiSubagentsSkillAdapterHeader();

    assert.match(adapter, /subagent\(\{ agent: "gsd-executor", task: "Execute plan X", context: "fresh" \}\)/);
    assert.match(adapter, /subagent\(\{ agent: "gsd-executor", task: "Execute plan X", context: "fresh", async: true \}\)/);
    assert.match(adapter, /subagent\(\{ action: "status" \}\)/);
    assert.match(adapter, /subagent\(\{ action: "status", id: "<run-id>" \}\)/);
    assert.match(adapter, /tasks: \[\{ agent: "gsd-executor", task: "Execute plan A" \}, \{ agent: "gsd-executor", task: "Execute plan B" \}\]/);
    assert.match(adapter, /worktree: true/);
    assert.match(adapter, /chain: \[\{ agent: "gsd-phase-researcher", task: "Research phase" \}, \{ agent: "gsd-planner" \}\]/);
  });

  test('hardens the no-subagent fallback path so Pi does not invent missing tools', () => {
    const adapter = getPiSubagentsSkillAdapterHeader();

    assert.match(adapter, /If the `subagent` tool is unavailable, do not call `subagent`, `Agent`, or `TaskOutput`/);
    assert.match(adapter, /execute the workflow sequentially inline/);
    assert.match(adapter, /Do not simulate background work with sleep loops/);
    assert.match(adapter, /Do not create fake run ids/);
  });

  test('preserves Pi adapter injection idempotently for installed skills', () => {
    const input = [
      '---',
      'name: gsd-execute-phase',
      'description: Execute a phase',
      '---',
      '',
      'Body.',
    ].join('\n');

    const once = injectPiSubagentsSkillAdapter(input);
    const twice = injectPiSubagentsSkillAdapter(once);

    assert.equal((twice.match(/<pi_subagents_adapter>/g) || []).length, 1);
    assert.ok(twice.includes('subagent({ tasks: [{ agent: "gsd-executor", task: "Execute plan A" }, { agent: "gsd-executor", task: "Execute plan B" }], context: "fresh", worktree: true })'));
  });
});

describe('Pi subagent agent frontmatter', () => {
  test('emits child-safety fields that match pi-subagents discovery and fallback expectations', () => {
    const input = [
      '---',
      'name: gsd-executor',
      'description: Executes plans',
      'tools: Read, Write, Bash, Agent',
      'skills:',
      '  - gsd-execute-phase',
      'color: blue',
      '---',
      '',
      'Read CLAUDE.md and execute the assigned plan.',
    ].join('\n');

    const result = convertClaudeAgentToPiSubagentAgent(input, {
      model: 'openai-codex/gpt-5.3-codex',
      thinking: 'medium',
    });
    const frontmatter = result.split('---')[1];

    assert.match(frontmatter, /^systemPromptMode: append$/m);
    assert.match(frontmatter, /^inheritProjectContext: true$/m);
    assert.match(frontmatter, /^inheritSkills: false$/m);
    assert.match(frontmatter, /^defaultContext: fresh$/m);
    assert.match(frontmatter, /^maxSubagentDepth: 0$/m);
    assert.match(frontmatter, /^model: "openai-codex\/gpt-5\.3-codex"$/m);
    assert.match(frontmatter, /^thinking: "medium"$/m);
    assert.doesNotMatch(frontmatter, /^tools:/m);
    assert.doesNotMatch(frontmatter, /subagent/);
    assert.doesNotMatch(frontmatter, /^skills:/m);
    assert.doesNotMatch(frontmatter, /^color:/m);
    assert.ok(result.includes('AGENTS.md'));
    assert.ok(!result.includes('CLAUDE.md'));
  });
});
