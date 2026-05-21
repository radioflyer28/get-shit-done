process.env.GSD_TEST_MODE = '1';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { cleanup } = require('./helpers.cjs');

function loadPiExtension() {
  const extensionPath = path.join(__dirname, '..', 'pi-extensions', 'gsd-hooks.ts');
  let source = fs.readFileSync(extensionPath, 'utf8');
  source = source.replace(/import type \{ ExtensionAPI \} from "@earendil-works\/pi-coding-agent";\r?\n/, '');
  source = source.replace(/import \* as fs from "node:fs";/, 'const fs = require("node:fs");');
  source = source.replace(/import \* as path from "node:path";/, 'const path = require("node:path");');
  source = source.replace(/export default function\s*\(\s*pi:\s*ExtensionAPI\s*\)/, 'module.exports = function (pi)');
  source = source.replace(/const (\w+): string\[\] =/g, 'const $1 =');
  source = source.replace(/(\w+): Record<string, any>/g, '$1');
  source = source.replace(/(\w+): any/g, '$1');
  source = source.replace(/(\w+): string\[\]/g, '$1');
  source = source.replace(/(\w+): string/g, '$1');
  source = source.replace(/(\w+): void/g, '$1');
  source = source.replace(/\)\s*:\s*(?:\{[^}]+\}|Record<string, any>|string\[\]|any|string|void|boolean|string \| null|number \| null)\s*\{/g, ') {');

  const sandbox = {
    require,
    module: { exports: {} },
    exports: {},
    process,
  };
  vm.runInNewContext(source, sandbox, { filename: extensionPath });
  return sandbox.module.exports;
}

function registerExtension() {
  const handlers = {};
  loadPiExtension()({
    on(name, handler) {
      handlers[name] = handler;
    },
  });
  return handlers;
}

function createCtx(cwd, contextUsage = null) {
  const calls = [];
  return {
    ctx: {
      cwd,
      ui: {
        notify: (...args) => calls.push({ method: 'notify', args }),
        setWidget: (...args) => calls.push({ method: 'setWidget', args }),
        setStatus: (...args) => calls.push({ method: 'setStatus', args }),
      },
      getContextUsage: contextUsage ? () => contextUsage : undefined,
    },
    calls,
  };
}

describe('Pi extension runtime parity behavior', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-pi-extension-'));
    fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'config.json'),
      JSON.stringify({ hooks: { community: true, workflow_guard: true } }, null, 2)
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      '---\nstatus: active\nmilestone: M1\n---\n\nCurrent phase: Build Pi parity\n'
    );
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('session_start publishes GSD state to both widget and Pi status footer', async () => {
    const handlers = registerExtension();
    const { ctx, calls } = createCtx(tmpDir);

    await handlers.session_start({ cwd: tmpDir }, ctx);

    assert.ok(calls.some(call => call.method === 'setWidget' && call.args[0] === 'gsd-session-state'));
    assert.ok(calls.some(call =>
      call.method === 'setStatus' &&
      call.args[0] === 'gsd' &&
      String(call.args[1]).includes('GSD')
    ), 'session_start should set a Pi footer status for GSD state');
  });

  test('tool_call blocks invalid git commit messages when community hooks are enabled', async () => {
    const handlers = registerExtension();
    const { ctx } = createCtx(tmpDir);

    const result = await handlers.tool_call({
      cwd: tmpDir,
      toolName: 'bash',
      input: { command: 'git commit -m "updated stuff"' },
    }, ctx);

    assert.equal(result.block, true);
    assert.equal(
      result.reason,
      'CONVENTIONAL_COMMITS_VIOLATION: Commit message must follow Conventional Commits: <type>(<scope>): <subject>.'
    );
  });

  test('tool_result adds phase-boundary context after .planning writes', async () => {
    const handlers = registerExtension();
    const { ctx, calls } = createCtx(tmpDir);

    const result = await handlers.tool_result({
      cwd: tmpDir,
      toolName: 'write',
      input: { path: '.planning/PLAN.md' },
      content: 'Wrote PLAN.md',
    }, ctx);

    assert.match(String(result.content), /\.planning\/ file modified: \.planning\/PLAN\.md/);
    assert.ok(calls.some(call =>
      call.method === 'notify' &&
      String(call.args[0]).includes('Should STATE.md be updated')
    ));
  });

  test('tool_result warns the model when Pi context usage is critical', async () => {
    const handlers = registerExtension();
    const { ctx, calls } = createCtx(tmpDir, {
      remainingPercentage: 24,
      usedPercentage: 76,
    });

    const result = await handlers.tool_result({
      cwd: tmpDir,
      toolName: 'read',
      input: { path: 'src/app.js' },
      content: 'normal tool result without prompt injection content',
    }, ctx);

    assert.match(String(result.content), /CONTEXT CRITICAL: Usage at 76%\. Remaining: 24%\./);
    assert.ok(calls.some(call =>
      call.method === 'setStatus' &&
      call.args[0] === 'gsd-context' &&
      String(call.args[1]).includes('24% remaining')
    ));
  });
});
