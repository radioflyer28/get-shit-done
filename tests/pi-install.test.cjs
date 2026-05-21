process.env.GSD_TEST_MODE = '1';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createTempDir, cleanup, parseFrontmatter } = require('./helpers.cjs');

const {
  getDirName,
  getGlobalDir,
  getConfigDirFromHome,
  install,
  uninstall,
  writeManifest,
} = require('../bin/install.js');

describe('Pi runtime directory mapping', () => {
  test('maps Pi to .pi for local installs', () => {
    assert.strictEqual(getDirName('pi'), '.pi');
  });

  test('maps Pi to ~/.pi/agent for global installs', () => {
    const originalPiAgentHome = process.env.PI_AGENT_HOME;
    const originalPiConfigDir = process.env.PI_CONFIG_DIR;
    delete process.env.PI_AGENT_HOME;
    delete process.env.PI_CONFIG_DIR;
    try {
      assert.strictEqual(getGlobalDir('pi'), path.join(os.homedir(), '.pi', 'agent'));
    } finally {
      if (originalPiAgentHome === undefined) delete process.env.PI_AGENT_HOME;
      else process.env.PI_AGENT_HOME = originalPiAgentHome;
      if (originalPiConfigDir === undefined) delete process.env.PI_CONFIG_DIR;
      else process.env.PI_CONFIG_DIR = originalPiConfigDir;
    }
  });

  test('returns .pi local and .pi/agent global config fragments', () => {
    assert.strictEqual(getConfigDirFromHome('pi', false), "'.pi'");
    assert.strictEqual(getConfigDirFromHome('pi', true), "'.pi', 'agent'");
  });
});

describe('getGlobalDir (Pi)', () => {
  let originalPiAgentHome;
  let originalPiConfigDir;

  beforeEach(() => {
    originalPiAgentHome = process.env.PI_AGENT_HOME;
    originalPiConfigDir = process.env.PI_CONFIG_DIR;
  });

  afterEach(() => {
    if (originalPiAgentHome !== undefined) process.env.PI_AGENT_HOME = originalPiAgentHome;
    else delete process.env.PI_AGENT_HOME;
    if (originalPiConfigDir !== undefined) process.env.PI_CONFIG_DIR = originalPiConfigDir;
    else delete process.env.PI_CONFIG_DIR;
  });

  test('returns ~/.pi/agent with no env var or explicit dir', () => {
    delete process.env.PI_AGENT_HOME;
    delete process.env.PI_CONFIG_DIR;
    assert.strictEqual(getGlobalDir('pi'), path.join(os.homedir(), '.pi', 'agent'));
  });

  test('returns explicit dir when provided', () => {
    assert.strictEqual(getGlobalDir('pi', '/custom/pi-agent'), '/custom/pi-agent');
  });

  test('respects PI_AGENT_HOME env var', () => {
    process.env.PI_AGENT_HOME = '~/custom-pi-agent';
    process.env.PI_CONFIG_DIR = '~/lower-priority-pi';
    assert.strictEqual(getGlobalDir('pi'), path.join(os.homedir(), 'custom-pi-agent'));
  });

  test('respects PI_CONFIG_DIR when PI_AGENT_HOME is unset', () => {
    delete process.env.PI_AGENT_HOME;
    process.env.PI_CONFIG_DIR = '~/custom-pi-config';
    assert.strictEqual(getGlobalDir('pi'), path.join(os.homedir(), 'custom-pi-config'));
  });
});

describe('Pi local install/uninstall', () => {
  let tmpDir;
  let previousCwd;

  beforeEach(() => {
    tmpDir = createTempDir('gsd-pi-install-');
    previousCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    cleanup(tmpDir);
  });

  test('installs GSD into ./.pi and removes it cleanly', () => {
    const result = install(false, 'pi');
    const targetDir = path.join(tmpDir, '.pi');

    assert.strictEqual(result.runtime, 'pi');
    assert.strictEqual(result.configDir, fs.realpathSync(targetDir));
    assert.ok(fs.existsSync(path.join(targetDir, 'skills', 'gsd-help', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(targetDir, 'get-shit-done', 'VERSION')));
    assert.ok(fs.existsSync(path.join(targetDir, 'agents')));
    assert.ok(fs.existsSync(path.join(targetDir, 'extensions', 'gsd-hooks.ts')));

    const manifest = writeManifest(targetDir, 'pi');
    assert.ok(Object.keys(manifest.files).some(file => file.startsWith('skills/gsd-help/')), manifest);
    assert.ok(Object.keys(manifest.files).some(file => file === 'extensions/gsd-hooks.ts'), manifest);

    uninstall(false, 'pi');

    assert.ok(!fs.existsSync(path.join(targetDir, 'skills', 'gsd-help')), 'Pi skill directory removed');
    assert.ok(!fs.existsSync(path.join(targetDir, 'get-shit-done')), 'get-shit-done removed');
    assert.ok(!fs.existsSync(path.join(targetDir, 'extensions', 'gsd-hooks.ts')), 'managed Pi extension removed');
  });

  test('installs Pi-native extension hooks instead of legacy subprocess hooks', () => {
    install(false, 'pi');
    const targetDir = path.join(tmpDir, '.pi');
    const extensionPath = path.join(targetDir, 'extensions', 'gsd-hooks.ts');

    assert.ok(fs.existsSync(extensionPath), 'Pi extension hook file installed');
    assert.ok(!fs.existsSync(path.join(targetDir, 'hooks')), 'legacy hooks/ directory is not installed for Pi');

    const content = fs.readFileSync(extensionPath, 'utf8');
    assert.match(content, /export default function\s*\(\s*pi:\s*ExtensionAPI\s*\)/);
    assert.match(content, /pi\.on\("session_start"/);
    assert.match(content, /pi\.on\("tool_call"/);
    assert.match(content, /pi\.on\("tool_result"/);
    assert.match(content, /READ-BEFORE-EDIT REMINDER/);
    assert.match(content, /WORKFLOW ADVISORY/);
    assert.match(content, /PROMPT INJECTION WARNING/);
    assert.match(content, /READ INJECTION SCAN/);
  });

  test('removes stale GSD subprocess hooks during Pi install but preserves user hooks', () => {
    const targetDir = path.join(tmpDir, '.pi');
    const hooksDir = path.join(targetDir, 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(path.join(hooksDir, 'gsd-read-guard.js'), 'old gsd hook');
    fs.writeFileSync(path.join(hooksDir, 'user-hook.js'), 'user hook');

    install(false, 'pi');

    assert.ok(!fs.existsSync(path.join(hooksDir, 'gsd-read-guard.js')), 'stale managed hook removed');
    assert.ok(fs.existsSync(path.join(hooksDir, 'user-hook.js')), 'user hook preserved');
    assert.ok(fs.existsSync(path.join(targetDir, 'extensions', 'gsd-hooks.ts')), 'Pi extension installed');
  });

  test('installed SKILL.md frontmatter conforms to Agent Skills shape', () => {
    install(false, 'pi');
    const targetDir = path.join(tmpDir, '.pi');
    const skillsDir = path.join(targetDir, 'skills');
    const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name.startsWith('gsd-'))
      .map(e => e.name);

    assert.ok(skillDirs.length > 0, 'at least one gsd-* skill installed');

    for (const dir of skillDirs) {
      const content = fs.readFileSync(path.join(skillsDir, dir, 'SKILL.md'), 'utf8');
      const fm = parseFrontmatter(content);
      assert.strictEqual(fm.name, dir, `${dir}/SKILL.md name matches dir`);
      assert.ok(typeof fm.description === 'string' && fm.description.length > 0,
        `${dir}/SKILL.md has non-empty description`);
      assert.equal(fm['allowed-tools'], undefined,
        `${dir}/SKILL.md omits Claude-style allowed-tools list for Pi`);
    }
  });

  test('replaces Claude paths and CLAUDE.md references for Pi', () => {
    install(false, 'pi');
    const targetDir = path.join(tmpDir, '.pi');
    const skillPath = path.join(targetDir, 'skills', 'gsd-plan-phase', 'SKILL.md');
    const content = fs.readFileSync(skillPath, 'utf8');
    const expectedWorkflowRef = `${path.resolve(targetDir).replace(/\\/g, '/')}/get-shit-done/workflows/plan-phase.md`;

    assert.ok(content.includes(`@${expectedWorkflowRef}`), `expected workflow ref ${expectedWorkflowRef}`);
    assert.ok(!content.includes('.claude/'), 'skill content should not contain .claude paths');
    assert.ok(!content.includes('CLAUDE.md'), 'skill content should not contain CLAUDE.md');

    const codeReview = fs.readFileSync(path.join(targetDir, 'skills', 'gsd-code-review', 'SKILL.md'), 'utf8');
    assert.ok(!codeReview.includes('CLAUDE.md'), 'skills with project-instruction references should not contain CLAUDE.md');
    assert.ok(codeReview.includes('AGENTS.md'), 'skills with project-instruction references should point Pi users at AGENTS.md');
  });

  test('injects optional pi-subagents adapter into the core workflow skill family', () => {
    install(false, 'pi');
    const targetDir = path.join(tmpDir, '.pi');
    const skills = [
      'gsd-plan-phase',
      'gsd-execute-phase',
      'gsd-code-review',
      'gsd-map-codebase',
      'gsd-docs-update',
      'gsd-new-project',
      'gsd-new-milestone',
      'gsd-debug',
      'gsd-autonomous',
      'gsd-manager',
    ];

    for (const skill of skills) {
      const content = fs.readFileSync(path.join(targetDir, 'skills', skill, 'SKILL.md'), 'utf8');
      assert.ok(content.includes('<pi_subagents_adapter>'), `${skill} contains Pi adapter`);
      assert.ok(content.includes('pi-subagents is optional'), `${skill} documents optional package`);
      assert.ok(content.includes('subagent({ agent: "x", task: "y", context: "fresh" })'), `${skill} documents Agent mapping`);
      assert.ok(content.includes('run_in_background=true'), `${skill} documents async mapping`);
      assert.ok(content.includes('TaskOutput'), `${skill} documents status polling mapping`);
      assert.equal((content.match(/<pi_subagents_adapter>/g) || []).length, 1, `${skill} adapter injected once`);
    }
  });

  test('installs pi-subagents-ready agents with no Claude-only frontmatter', () => {
    install(false, 'pi');
    const targetDir = path.join(tmpDir, '.pi');
    const agentPath = path.join(targetDir, 'agents', 'gsd-executor.md');
    const content = fs.readFileSync(agentPath, 'utf8');
    const fm = parseFrontmatter(content);

    assert.strictEqual(fm.name, 'gsd-executor');
    assert.strictEqual(fm.systemPromptMode, 'append');
    assert.strictEqual(fm.inheritProjectContext, 'true');
    assert.strictEqual(fm.inheritSkills, 'false');
    assert.strictEqual(fm.defaultContext, 'fresh');
    assert.strictEqual(fm.maxSubagentDepth, '0');
    assert.equal(fm.tools, undefined, 'Pi agents omit Claude tool allowlists');
    assert.equal(fm.color, undefined, 'Pi agents omit Claude color');
    assert.equal(fm.skills, undefined, 'Pi agents omit Claude skills list');
    assert.ok(!content.includes('CLAUDE.md'), 'agent content should not contain CLAUDE.md');
    assert.ok(!content.includes('.claude/'), 'agent content should not contain .claude paths');
    assert.ok(!content.includes('Claude Code'), 'agent content should not contain Claude Code branding');
  });

  test('runtime:"pi" emits openai-codex model and thinking frontmatter for agents', () => {
    fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'config.json'),
      JSON.stringify({ runtime: 'pi', model_profile: 'balanced' }, null, 2)
    );

    install(false, 'pi');
    const targetDir = path.join(tmpDir, '.pi');
    const planner = parseFrontmatter(fs.readFileSync(path.join(targetDir, 'agents', 'gsd-planner.md'), 'utf8'));
    const executor = parseFrontmatter(fs.readFileSync(path.join(targetDir, 'agents', 'gsd-executor.md'), 'utf8'));

    assert.strictEqual(planner.model, 'openai-codex/gpt-5.5');
    assert.strictEqual(planner.thinking, 'high');
    assert.strictEqual(executor.model, 'openai-codex/gpt-5.3-codex');
    assert.strictEqual(executor.thinking, 'medium');
  });
});
