'use strict';
/**
 * git-forensics.test.cjs — Integration tests for Phase 9 git forensics deliverables.
 *
 * Tests:
 *   FOR-01: git_forensics.sh exists and is valid bash
 *   FOR-02: git_forensics_report.py exists and passes syntax check
 *   FOR-03: git-forensics.md workflow exists with required structure
 *   FOR-04: threat-scan.md references git_forensics.sh and git_forensics step
 *   FOR-05: Python engine has all four detection functions
 *   FOR-06: Report builder has render_report and all five sections
 *   FOR-07: Standalone git-forensics workflow has process/step structure
 *   FOR-SECURITY: Commit messages isolated in XML-like tags in report renderer
 *   FOR-THREAT: threat-scan.md passes GIT_FORENSICS_FINDINGS to tool context
 *   FOR-CONNECT: git_forensics.sh invokes git_forensics_report.py via python3
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'get-shit-done', 'bin');
const WORKFLOWS = path.join(ROOT, 'get-shit-done', 'workflows');

const SHIM_PATH = path.join(BIN, 'git_forensics.sh');
const PY_PATH = path.join(BIN, 'git_forensics_report.py');
const WORKFLOW_PATH = path.join(WORKFLOWS, 'git-forensics.md');
const THREAT_SCAN_PATH = path.join(WORKFLOWS, 'threat-scan.md');

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function readFile(p) {
  return fs.readFileSync(p, 'utf-8');
}

// ---------------------------------------------------------------------------
// FOR-01: Bash shim exists and looks valid
// ---------------------------------------------------------------------------
describe('FOR-01: git_forensics.sh exists', () => {
  test('file exists', () => {
    assert.ok(fs.existsSync(SHIM_PATH), `Missing: ${SHIM_PATH}`);
  });

  test('starts with shebang', () => {
    const content = readFile(SHIM_PATH);
    assert.ok(content.startsWith('#!/'), 'Missing shebang line');
  });

  test('validates git repo before running git commands', () => {
    const content = readFile(SHIM_PATH);
    assert.ok(
      content.includes('rev-parse') || content.includes('is-inside-work-tree'),
      'Missing git repository validation'
    );
  });

  test('exits 1 for non-git directory with error message', () => {
    const content = readFile(SHIM_PATH);
    assert.ok(content.includes('exit 1'), 'Missing exit 1 for non-git dir');
    assert.ok(
      content.includes('not a git repository') || content.includes('not a git repo'),
      'Missing error message for non-git dir'
    );
  });

  test('collects git_log.txt', () => {
    const content = readFile(SHIM_PATH);
    assert.ok(content.includes('git_log.txt'), 'Missing git_log.txt collection');
  });

  test('collects git_reflog.txt', () => {
    const content = readFile(SHIM_PATH);
    assert.ok(content.includes('git_reflog.txt'), 'Missing git_reflog.txt collection');
  });

  test('collects gitattributes.txt', () => {
    const content = readFile(SHIM_PATH);
    assert.ok(content.includes('gitattributes.txt'), 'Missing gitattributes.txt collection');
  });

  test('cleans up tmp files on exit (trap EXIT)', () => {
    const content = readFile(SHIM_PATH);
    assert.ok(content.includes('trap') && content.includes('EXIT'), 'Missing trap EXIT cleanup');
  });

  test('invokes git_forensics_report.py via python3', () => {
    const content = readFile(SHIM_PATH);
    assert.ok(
      content.includes('python3') && content.includes('git_forensics_report.py'),
      'Missing python3 invocation of git_forensics_report.py'
    );
  });

  test('has min 60 lines', () => {
    const lines = readFile(SHIM_PATH).split('\n').filter(l => l.trim()).length;
    assert.ok(lines >= 60, `Too short: ${lines} non-empty lines (expected ≥60)`);
  });
});

// ---------------------------------------------------------------------------
// FOR-02: Python engine exists and is syntactically valid
// ---------------------------------------------------------------------------
describe('FOR-02: git_forensics_report.py exists', () => {
  test('file exists', () => {
    assert.ok(fs.existsSync(PY_PATH), `Missing: ${PY_PATH}`);
  });

  test('has min 120 lines', () => {
    const lines = readFile(PY_PATH).split('\n').filter(l => l.trim()).length;
    assert.ok(lines >= 120, `Too short: ${lines} non-empty lines (expected ≥120)`);
  });
});

// ---------------------------------------------------------------------------
// FOR-05: Python engine has all four detection functions
// ---------------------------------------------------------------------------
describe('FOR-05: Python detection functions present', () => {
  let content;
  test('reads file', () => {
    content = readFile(PY_PATH);
    assert.ok(content.length > 0);
  });

  test('detect_binary_blobs function defined', () => {
    assert.ok(readFile(PY_PATH).includes('def detect_binary_blobs'), 'Missing detect_binary_blobs');
  });

  test('detect_history_rewrites function defined', () => {
    assert.ok(readFile(PY_PATH).includes('def detect_history_rewrites'), 'Missing detect_history_rewrites');
  });

  test('detect_attribute_vectors function defined', () => {
    assert.ok(readFile(PY_PATH).includes('def detect_attribute_vectors'), 'Missing detect_attribute_vectors');
  });

  test('detect_author_anomalies function defined', () => {
    assert.ok(readFile(PY_PATH).includes('def detect_author_anomalies'), 'Missing detect_author_anomalies');
  });
});

// ---------------------------------------------------------------------------
// FOR-06: Report builder has render_report + five report sections
// ---------------------------------------------------------------------------
describe('FOR-06: render_report and report sections', () => {
  test('render_report function defined', () => {
    assert.ok(readFile(PY_PATH).includes('def render_report'), 'Missing render_report');
  });

  test('report has Summary section', () => {
    assert.ok(readFile(PY_PATH).includes('## Summary'), 'Missing Summary section');
  });

  test('report has Binary Blobs section', () => {
    assert.ok(readFile(PY_PATH).includes('## Binary Blobs'), 'Missing Binary Blobs section');
  });

  test('report has History Rewrites section', () => {
    assert.ok(readFile(PY_PATH).includes('## History Rewrites'), 'Missing History Rewrites section');
  });

  test('report has Attribute Execution Vectors section', () => {
    assert.ok(readFile(PY_PATH).includes('## Attribute Execution Vectors'), 'Missing Attribute Execution Vectors section');
  });

  test('report has Author Anomalies section', () => {
    assert.ok(readFile(PY_PATH).includes('## Author Anomalies'), 'Missing Author Anomalies section');
  });

  test('report has Raw Data section', () => {
    assert.ok(readFile(PY_PATH).includes('## Raw Data'), 'Missing Raw Data section');
  });
});

// ---------------------------------------------------------------------------
// FOR-SECURITY: Prompt injection defense — commit messages in XML tags
// ---------------------------------------------------------------------------
describe('FOR-SECURITY: Prompt injection defense', () => {
  test('commit subjects isolated in XML-like tags', () => {
    const content = readFile(PY_PATH);
    assert.ok(
      content.includes('<blob-subject>') || content.includes('<reflog-action>') || content.includes('<author>'),
      'Missing XML isolation tags for untrusted content'
    );
  });

  test('report notes content is untrusted', () => {
    const content = readFile(PY_PATH);
    assert.ok(
      content.includes('untrusted') || content.includes('treat as data'),
      'Missing untrusted content warning in report'
    );
  });
});

// ---------------------------------------------------------------------------
// FOR-03: git-forensics.md workflow exists with required structure
// ---------------------------------------------------------------------------
describe('FOR-03: git-forensics.md workflow structure', () => {
  test('file exists', () => {
    assert.ok(fs.existsSync(WORKFLOW_PATH), `Missing: ${WORKFLOW_PATH}`);
  });

  test('has <purpose> block', () => {
    assert.ok(readFile(WORKFLOW_PATH).includes('<purpose>'), 'Missing <purpose> block');
  });

  test('has <process> block', () => {
    assert.ok(readFile(WORKFLOW_PATH).includes('<process>'), 'Missing <process> block');
  });

  test('has at least one <step>', () => {
    assert.ok(readFile(WORKFLOW_PATH).includes('<step'), 'Missing <step> elements');
  });

  test('has <output> block', () => {
    assert.ok(readFile(WORKFLOW_PATH).includes('<output>'), 'Missing <output> block');
  });

  test('references git_forensics.sh', () => {
    assert.ok(readFile(WORKFLOW_PATH).includes('git_forensics.sh'), 'Missing reference to git_forensics.sh');
  });

  test('mentions static analysis only', () => {
    const content = readFile(WORKFLOW_PATH);
    assert.ok(
      content.toLowerCase().includes('static analysis'),
      'Missing "static analysis" safety note'
    );
  });

  test('has min 80 lines', () => {
    const lines = readFile(WORKFLOW_PATH).split('\n').filter(l => l.trim()).length;
    assert.ok(lines >= 80, `Too short: ${lines} non-empty lines (expected ≥80)`);
  });
});

// ---------------------------------------------------------------------------
// FOR-04: threat-scan.md integration
// ---------------------------------------------------------------------------
describe('FOR-04: threat-scan.md integration', () => {
  test('threat-scan.md exists', () => {
    assert.ok(fs.existsSync(THREAT_SCAN_PATH), `Missing: ${THREAT_SCAN_PATH}`);
  });

  test('references git_forensics.sh', () => {
    assert.ok(
      readFile(THREAT_SCAN_PATH).includes('git_forensics.sh'),
      'threat-scan.md does not reference git_forensics.sh'
    );
  });

  test('has git_forensics step block', () => {
    assert.ok(
      readFile(THREAT_SCAN_PATH).includes('git_forensics'),
      'Missing git_forensics step in threat-scan.md'
    );
  });
});

// ---------------------------------------------------------------------------
// FOR-THREAT: GIT_FORENSICS_FINDINGS passed to tool context
// ---------------------------------------------------------------------------
describe('FOR-THREAT: forensics findings passed to agent', () => {
  test('GIT_FORENSICS_FINDINGS variable set in threat-scan.md', () => {
    assert.ok(
      readFile(THREAT_SCAN_PATH).includes('GIT_FORENSICS_FINDINGS'),
      'Missing GIT_FORENSICS_FINDINGS variable'
    );
  });

  test('<git_forensics> passed to agent prompt', () => {
    assert.ok(
      readFile(THREAT_SCAN_PATH).includes('<git_forensics>'),
      'Missing <git_forensics> tag in agent prompt context'
    );
  });
});

// ---------------------------------------------------------------------------
// FOR-07: Standalone invocation documented
// ---------------------------------------------------------------------------
describe('FOR-07: Standalone invocation', () => {
  test('git_forensics.sh supports standalone execution (accepts path arg)', () => {
    const content = readFile(SHIM_PATH);
    assert.ok(
      content.includes('$1') || content.includes('TARGET='),
      'Missing positional arg handling for target path'
    );
  });

  test('git-forensics.md documents standalone invocation', () => {
    const content = readFile(WORKFLOW_PATH);
    assert.ok(
      content.includes('Standalone') || content.includes('standalone'),
      'Missing standalone invocation documentation'
    );
  });
});
