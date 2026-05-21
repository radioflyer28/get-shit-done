/**
 * Regression test for issue #2545.
 *
 * The Copilot content converter's `~/.claude/` and `$HOME/.claude/` replacements
 * only matched when a literal slash followed, so bare `~/.claude` references
 * (end of line, quotes, punctuation) were left unreplaced. Those leaks then
 * triggered the installer's "Found N unreplaced .claude path reference(s)"
 * warning, which scans for `(?:~|$HOME)/\.claude\b`.
 *
 * Fix: replace with a word-boundary pattern so both forms are caught in a
 * single pass, matching the approach already used by the Antigravity, OpenCode,
 * Kilo, and Codex converters.
 */

process.env.GSD_TEST_MODE = '1';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  convertClaudeCommandToCodexSkill,
  convertClaudeToCopilotContent,
  collectLeakedClaudePathReferences,
} = require('../bin/install.js');

describe('convertClaudeToCopilotContent — bare ~/.claude (issue #2545)', () => {
  test('global install replaces bare ~/.claude at end of line', () => {
    const input = 'configDir = ~/.claude\n';
    const out = convertClaudeToCopilotContent(input, /* isGlobal */ true);
    assert.ok(
      !/(?:~|\$HOME)\/\.claude\b/.test(out),
      `expected no leaked ~/.claude reference, got: ${JSON.stringify(out)}`,
    );
    assert.match(out, /~\/\.copilot\b/);
  });

  test('global install replaces bare $HOME/.claude at end of line', () => {
    const input = 'configDir = $HOME/.claude\n';
    const out = convertClaudeToCopilotContent(input, /* isGlobal */ true);
    assert.ok(
      !/(?:~|\$HOME)\/\.claude\b/.test(out),
      `expected no leaked $HOME/.claude reference, got: ${JSON.stringify(out)}`,
    );
    assert.match(out, /\$HOME\/\.copilot\b/);
  });

  test('global install replaces bare ~/.claude before punctuation', () => {
    const input = 'paths include `~/.claude`, `~/.copilot`';
    const out = convertClaudeToCopilotContent(input, true);
    assert.ok(!/(?:~|\$HOME)\/\.claude\b/.test(out));
  });

  test('local install replaces bare ~/.claude', () => {
    const input = 'configDir = ~/.claude\n';
    const out = convertClaudeToCopilotContent(input, /* isGlobal */ false);
    assert.ok(
      !/(?:~|\$HOME)\/\.claude\b/.test(out),
      `expected no leaked ~/.claude reference, got: ${JSON.stringify(out)}`,
    );
  });

  test('does not double-replace trailing-slash form', () => {
    const input = '@~/.claude/get-shit-done/foo.md\n';
    const out = convertClaudeToCopilotContent(input, true);
    assert.match(out, /~\/\.copilot\/get-shit-done\/foo\.md/);
    assert.ok(!/\.copilot\/\.copilot/.test(out));
  });
});

describe('non-Claude leak scanner skips runtime-owned plugin caches', () => {
  test('ignores Codex plugin temp and backup directories while still catching GSD leaks', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-2545-leak-scan-'));
    try {
      const pluginTmp = path.join(root, '.tmp', 'plugins', 'plugins', 'superpowers', 'skills', 'writing-skills');
      const pluginBackup = path.join(root, '.tmp', 'plugins-backup-abc123', 'repo', 'plugins', 'superpowers');
      const gsdSkill = path.join(root, 'skills', 'gsd-example');
      fs.mkdirSync(pluginTmp, { recursive: true });
      fs.mkdirSync(pluginBackup, { recursive: true });
      fs.mkdirSync(gsdSkill, { recursive: true });

      fs.writeFileSync(path.join(pluginTmp, 'SKILL.md'), 'Plugin docs mention $HOME/.claude for Claude users.\n');
      fs.writeFileSync(path.join(pluginBackup, 'CREATION-LOG.md'), 'Backup docs mention ~/.claude.\n');
      fs.writeFileSync(path.join(gsdSkill, 'SKILL.md'), 'GSD leak: $HOME/.claude/get-shit-done/workflows/x.md\n');

      assert.deepStrictEqual(collectLeakedClaudePathReferences(root), [
        { file: 'skills/gsd-example/SKILL.md', count: 1 },
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('Codex conversion — bare ~/.claude paths', () => {
  test('replaces bare global Claude config references in command skills', () => {
    const input = [
      '---',
      'description: Test',
      '---',
      '',
      'Surface state: `~/.claude/.gsd-surface.json`',
      'Engine: `$HOME/.claude/get-shit-done/bin/lib/surface.cjs`',
      '',
    ].join('\n');

    const out = convertClaudeCommandToCodexSkill(input, 'gsd-surface');
    assert.doesNotMatch(out, /(?:~|\$HOME)\/\.claude\b/);
    assert.match(out, /~\/\.codex\/\.gsd-surface\.json/);
    assert.match(out, /\$HOME\/\.codex\/get-shit-done\/bin\/lib\/surface\.cjs/);
  });
});
