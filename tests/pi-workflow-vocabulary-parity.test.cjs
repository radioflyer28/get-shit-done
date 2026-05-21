process.env.GSD_TEST_MODE = '1';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createTempDir, cleanup } = require('./helpers.cjs');

const { install } = require('../bin/install.js');

function collectMarkdownFiles(root) {
  const files = [];
  function visit(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  visit(root);
  return files;
}

function scanFiles(files, rules, root) {
  const failures = [];
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');
    for (const rule of rules) {
      if (rule.pattern.test(content)) {
        failures.push(`${rel}: ${rule.message}`);
      }
    }
  }
  return failures;
}

describe('Pi generated workflow vocabulary parity', () => {
  let tmpDir;
  let previousCwd;

  beforeEach(() => {
    tmpDir = createTempDir('gsd-pi-vocab-');
    previousCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    cleanup(tmpDir);
  });

  test('installed Pi skills, agents, and workflows avoid Claude/Codex-only vocabulary', () => {
    install(false, 'pi');
    const targetDir = path.join(tmpDir, '.pi');
    const files = [
      ...collectMarkdownFiles(path.join(targetDir, 'skills')),
      ...collectMarkdownFiles(path.join(targetDir, 'agents')),
      ...collectMarkdownFiles(path.join(targetDir, 'get-shit-done', 'workflows')),
    ];

    const failures = scanFiles(files, [
      { pattern: /\bCLAUDE\.md\b/, message: 'uses CLAUDE.md instead of AGENTS.md' },
      { pattern: /(?:^|[^\w.-])\.claude\//, message: 'uses .claude/ path instead of .pi/' },
      { pattern: /\bClaude Code\b/, message: 'uses Claude Code product vocabulary' },
      { pattern: /\bAskUserQuestion\b|\bask_user\b/, message: 'uses Claude-only interactive tool vocabulary' },
      { pattern: /(?<![A-Za-z0-9./])\/gsd:([a-z0-9-]+)/, message: 'uses Claude/Gemini /gsd: command syntax instead of /skill:gsd-*' },
      { pattern: /(?<![A-Za-z0-9./])\/gsd-([a-z0-9-]+)(?![A-Za-z0-9/-])/, message: 'uses slash /gsd-* command syntax instead of /skill:gsd-*' },
      { pattern: /\bCODEX RUNTIME\b/, message: 'uses Codex-specific runtime rule label' },
    ], targetDir);

    assert.deepStrictEqual(failures, []);
  });
});
