process.env.GSD_TEST_MODE = '1';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createTempDir, createTempProject, cleanup, runGsdTools } = require('./helpers.cjs');

const { install } = require('../bin/install.js');

describe('Pi project instruction artifact parity', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'PROJECT.md'),
      '# Test Project\n\nA Pi-hosted project.\n',
      'utf-8'
    );
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('generate-claude-md writes AGENTS.md when config.runtime is pi', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'config.json'),
      JSON.stringify({ runtime: 'pi', claude_md_path: './CLAUDE.md' }),
      'utf-8'
    );

    const result = runGsdTools('generate-claude-md', tmpDir, { HOME: tmpDir });
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    const realTmpDir = fs.realpathSync(tmpDir);
    const expectedAgentsPath = path.join(realTmpDir, 'AGENTS.md');

    assert.strictEqual(parsed.claude_md_path, expectedAgentsPath);
    assert.ok(fs.existsSync(expectedAgentsPath), 'AGENTS.md must exist after generation');
    assert.ok(!fs.existsSync(path.join(realTmpDir, 'CLAUDE.md')), 'CLAUDE.md must not be created for Pi runtime');
  });

  test('generate-claude-md writes AGENTS.md when GSD_RUNTIME=pi', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'config.json'),
      JSON.stringify({ runtime: 'claude', claude_md_path: './CLAUDE.md' }),
      'utf-8'
    );

    const result = runGsdTools('generate-claude-md', tmpDir, { HOME: tmpDir, GSD_RUNTIME: 'pi' });
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    const realTmpDir = fs.realpathSync(tmpDir);
    const expectedAgentsPath = path.join(realTmpDir, 'AGENTS.md');

    assert.strictEqual(parsed.claude_md_path, expectedAgentsPath);
    assert.ok(fs.existsSync(expectedAgentsPath), 'AGENTS.md must exist after generation');
    assert.ok(!fs.existsSync(path.join(realTmpDir, 'CLAUDE.md')), 'CLAUDE.md must not be created when GSD_RUNTIME=pi');
  });

  test('generate-claude-profile appends profile to AGENTS.md when config.runtime is pi', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'config.json'),
      JSON.stringify({ runtime: 'pi', claude_md_path: './CLAUDE.md' }),
      'utf-8'
    );
    const analysisPath = path.join(tmpDir, '.planning', 'analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify({
      dimensions: {
        communication_style: { rating: 'terse-direct', confidence: 'HIGH' },
      },
      data_source: 'test',
    }), 'utf-8');

    const result = runGsdTools(
      ['generate-claude-profile', '--analysis', analysisPath],
      tmpDir,
      { HOME: tmpDir }
    );
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    const realTmpDir = fs.realpathSync(tmpDir);
    const expectedAgentsPath = path.join(realTmpDir, 'AGENTS.md');

    assert.strictEqual(parsed.claude_md_path, expectedAgentsPath);
    assert.ok(fs.existsSync(expectedAgentsPath), 'AGENTS.md must exist after profile generation');
    assert.ok(!fs.existsSync(path.join(realTmpDir, 'CLAUDE.md')), 'CLAUDE.md must not be created for Pi profile generation');
  });
});

describe('Pi installed artifact defaults', () => {
  let tmpDir;
  let previousCwd;

  beforeEach(() => {
    tmpDir = createTempDir('gsd-pi-artifacts-');
    previousCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    cleanup(tmpDir);
  });

  test('installed config template defaults project instructions to AGENTS.md', () => {
    install(false, 'pi');
    const configTemplate = JSON.parse(fs.readFileSync(
      path.join(tmpDir, '.pi', 'get-shit-done', 'templates', 'config.json'),
      'utf-8'
    ));

    assert.strictEqual(configTemplate.claude_md_path, './AGENTS.md');
  });
});
