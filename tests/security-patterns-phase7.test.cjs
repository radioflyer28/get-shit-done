/**
 * Phase 7: Security Reference Sub-Skills Integration Tests
 *
 * Validates:
 * - All 7 language pattern files exist and have required structure
 * - OWASP foundation covers all 10 categories
 * - Semgrep rules library parses with required fields
 * - pattern-loader.cjs exports 5 functions and returns correct data
 * - Security-scanner agent updated with pattern context
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REFERENCES_DIR = path.join(ROOT, 'get-shit-done', 'references');
const AGENTS_DIR = path.join(ROOT, 'agents');

// ─── Helper ───────────────────────────────────────────────────────────────────

function readRef(filename) {
  return fs.readFileSync(path.join(REFERENCES_DIR, filename), 'utf8');
}

function countMatches(content, regex) {
  return (content.match(regex) || []).length;
}

// ─── OWASP Foundation ────────────────────────────────────────────────────────

describe('owasp-foundation', () => {
  const FOUNDATION_FILE = 'owasp-top-10-foundation.md';

  test('owasp-top-10-foundation.md exists', () => {
    assert.ok(fs.existsSync(path.join(REFERENCES_DIR, FOUNDATION_FILE)));
  });

  test('covers all 10 OWASP categories', () => {
    const content = readRef(FOUNDATION_FILE);
    const count = countMatches(content, /^### A\d{2}:\d{4}/gm);
    assert.ok(count >= 10, `Expected 10 OWASP categories, found ${count}`);
  });

  test('includes CWE mappings', () => {
    const content = readRef(FOUNDATION_FILE);
    assert.ok(content.includes('CWE-'), 'Missing CWE mappings');
  });

  test('includes Quick Reference Index table', () => {
    const content = readRef(FOUNDATION_FILE);
    assert.ok(content.includes('Quick Reference Index'), 'Missing Quick Reference Index');
  });

  test('includes metadata section with edition', () => {
    const content = readRef(FOUNDATION_FILE);
    assert.ok(content.includes('OWASP Top 10 2021'), 'Missing 2021 edition reference');
  });

  test('meets minimum line count (150+)', () => {
    const content = readRef(FOUNDATION_FILE);
    const lineCount = content.split('\n').length;
    assert.ok(lineCount >= 150, `Expected 150+ lines, got ${lineCount}`);
  });
});

// ─── Semgrep Rules Library ────────────────────────────────────────────────────

describe('semgrep-library', () => {
  const LIBRARY_FILE = 'semgrep-rules-library.yml';

  test('semgrep-rules-library.yml exists', () => {
    assert.ok(fs.existsSync(path.join(REFERENCES_DIR, LIBRARY_FILE)));
  });

  test('contains rules: section', () => {
    const content = readRef(LIBRARY_FILE);
    assert.ok(content.includes('rules:'), 'Missing rules: key');
  });

  test('contains version pin', () => {
    const content = readRef(LIBRARY_FILE);
    assert.ok(content.includes('semgrep_cli_pinned:'), 'Missing semgrep_cli_pinned');
  });

  test('has 20+ rules defined', () => {
    const content = readRef(LIBRARY_FILE);
    // Count rule entries (lines with 2-space indent followed by word chars and colon)
    const ruleLines = content.split('\n').filter(l => l.match(/^  [a-z][a-z0-9-]+:\s*$/));
    assert.ok(ruleLines.length >= 20, `Expected 20+ rules, found ${ruleLines.length}`);
  });

  test('meets minimum line count (300+)', () => {
    const content = readRef(LIBRARY_FILE);
    const lineCount = content.split('\n').length;
    assert.ok(lineCount >= 300, `Expected 300+ lines, got ${lineCount}`);
  });

  test('rules include OWASP mappings', () => {
    const content = readRef(LIBRARY_FILE);
    assert.ok(content.includes('owasp: '), 'Missing OWASP field in rules');
  });
});

// ─── Language Pattern Files ───────────────────────────────────────────────────

const LANGUAGE_FILES = [
  { file: 'python-security-patterns.md', minCategories: 6, minLines: 100 },
  { file: 'javascript-typescript-security-patterns.md', minCategories: 7, minLines: 100 },
  { file: 'go-security-patterns.md', minCategories: 4, minLines: 80 },
  { file: 'rust-security-patterns.md', minCategories: 5, minLines: 80 },
  { file: 'java-security-patterns.md', minCategories: 5, minLines: 80 },
  { file: 'cpp-security-patterns.md', minCategories: 3, minLines: 80 },
  { file: 'php-security-patterns.md', minCategories: 6, minLines: 80 },
];

describe('language-pattern-files', () => {
  for (const { file, minCategories, minLines } of LANGUAGE_FILES) {
    test(`${file} exists`, () => {
      assert.ok(fs.existsSync(path.join(REFERENCES_DIR, file)), `${file} not found`);
    });

    test(`${file} has ${minCategories}+ OWASP category sections`, () => {
      const content = readRef(file);
      const count = countMatches(content, /^### A\d{2}:\d{4}/gm);
      assert.ok(count >= minCategories, `${file}: expected ${minCategories}+ categories, found ${count}`);
    });

    test(`${file} has grep-based detection`, () => {
      const content = readRef(file);
      assert.ok(
        content.includes('Grep-Based Detection') || content.includes('grep'),
        `${file}: missing grep detection section`
      );
    });

    test(`${file} has semgrep rules reference`, () => {
      const content = readRef(file);
      assert.ok(
        content.includes('Semgrep') || content.includes('semgrep'),
        `${file}: missing semgrep rules section`
      );
    });

    test(`${file} meets minimum line count (${minLines}+)`, () => {
      const content = readRef(file);
      const lineCount = content.split('\n').length;
      assert.ok(lineCount >= minLines, `${file}: expected ${minLines}+ lines, got ${lineCount}`);
    });

    test(`${file} includes false positive rates`, () => {
      const content = readRef(file);
      assert.ok(
        content.includes('False Positive') || content.includes('FP Rate'),
        `${file}: missing false positive rates`
      );
    });

    test(`${file} has integration notes`, () => {
      const content = readRef(file);
      assert.ok(content.includes('Integration Notes'), `${file}: missing Integration Notes`);
    });
  }
});

// ─── Pattern Loader Module ───────────────────────────────────────────────────

describe('pattern-loader', () => {
  const LOADER_PATH = path.join(ROOT, 'get-shit-done', 'bin', 'lib', 'pattern-loader.cjs');

  test('pattern-loader.cjs exists', () => {
    assert.ok(fs.existsSync(LOADER_PATH), 'pattern-loader.cjs not found');
  });

  test('exports 5 required functions', () => {
    const loader = require(LOADER_PATH);
    assert.strictEqual(typeof loader.loadPatternFile, 'function');
    assert.strictEqual(typeof loader.loadSemgrepRules, 'function');
    assert.strictEqual(typeof loader.getSemgrepRuleById, 'function');
    assert.strictEqual(typeof loader.generateGrepCommand, 'function');
    assert.strictEqual(typeof loader.extractSemgrepRuleBlock, 'function');
  });

  test('loadPatternFile returns pattern data for python', () => {
    const loader = require(LOADER_PATH);
    const result = loader.loadPatternFile('python');
    assert.ok(result, 'loadPatternFile returned null for python');
    assert.ok(result.owasp_patterns.length > 0, 'No OWASP patterns found');
    assert.strictEqual(result.language, 'python');
  });

  test('loadPatternFile handles javascript alias', () => {
    const loader = require(LOADER_PATH);
    const result = loader.loadPatternFile('javascript');
    assert.ok(result, 'loadPatternFile returned null for javascript');
  });

  test('loadPatternFile handles language aliases (js → javascript)', () => {
    const loader = require(LOADER_PATH);
    const result = loader.loadPatternFile('js');
    assert.ok(result, 'loadPatternFile returned null for js alias');
  });

  test('loadSemgrepRules returns library with 20+ rules', () => {
    const loader = require(LOADER_PATH);
    const result = loader.loadSemgrepRules();
    assert.ok(result, 'loadSemgrepRules returned null');
    assert.ok(Object.keys(result.rules).length >= 20, `Expected 20+ rules, got ${Object.keys(result.rules).length}`);
  });

  test('loadSemgrepRules returns version info', () => {
    const loader = require(LOADER_PATH);
    const result = loader.loadSemgrepRules();
    assert.ok(result.semgrep_cli_version, 'Missing semgrep_cli_version');
    assert.ok(result.semgrep_cli_version !== 'unknown', 'semgrep_cli_version is unknown');
  });

  test('getSemgrepRuleById returns rule for python-eval-injection', () => {
    const loader = require(LOADER_PATH);
    const rule = loader.getSemgrepRuleById('python-eval-injection');
    assert.ok(rule, 'Rule not found');
    assert.ok(rule.owasp, 'Rule missing OWASP field');
    assert.ok(rule.languages, 'Rule missing languages field');
  });

  test('getSemgrepRuleById returns null for unknown rule', () => {
    const loader = require(LOADER_PATH);
    const rule = loader.getSemgrepRuleById('nonexistent-rule-xyz');
    assert.strictEqual(rule, null);
  });

  test('generateGrepCommand returns commands for python A03', () => {
    const loader = require(LOADER_PATH);
    const cmds = loader.generateGrepCommand('python', 'A03:2021');
    assert.ok(Array.isArray(cmds), 'Expected array');
    assert.ok(cmds.length > 0, 'No grep commands returned for python A03');
  });

  test('generateGrepCommand returns empty array for unknown language', () => {
    const loader = require(LOADER_PATH);
    const cmds = loader.generateGrepCommand('nonexistentlang', 'A03:2021');
    assert.ok(Array.isArray(cmds), 'Expected array');
    assert.strictEqual(cmds.length, 0);
  });

  test('extractSemgrepRuleBlock returns null for unknown rule', () => {
    const loader = require(LOADER_PATH);
    const result = loader.extractSemgrepRuleBlock(
      path.join(REFERENCES_DIR, 'python-security-patterns.md'),
      'nonexistent-rule-xyz'
    );
    assert.strictEqual(result, null);
  });
});

// ─── Security Scanner Agent ──────────────────────────────────────────────────

describe('security-scanner-agent', () => {
  const AGENT_FILE = path.join(AGENTS_DIR, 'gsd-security-scanner.md');

  test('gsd-security-scanner.md exists', () => {
    assert.ok(fs.existsSync(AGENT_FILE));
  });

  test('references owasp-top-10-foundation.md', () => {
    const content = fs.readFileSync(AGENT_FILE, 'utf8');
    assert.ok(content.includes('owasp-top-10-foundation.md'), 'Missing owasp-top-10-foundation.md reference');
  });

  test('references pattern-loader.cjs', () => {
    const content = fs.readFileSync(AGENT_FILE, 'utf8');
    assert.ok(content.includes('pattern-loader.cjs'), 'Missing pattern-loader.cjs reference');
  });

  test('has pattern context injection section', () => {
    const content = fs.readFileSync(AGENT_FILE, 'utf8');
    assert.ok(content.includes('Pattern Context'), 'Missing Pattern Context section');
  });
});
