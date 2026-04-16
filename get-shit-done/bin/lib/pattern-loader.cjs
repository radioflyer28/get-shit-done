'use strict';

/**
 * pattern-loader.cjs
 * Runtime loader for GSD security pattern reference files.
 * Consumed by security_prescan.py (via child_process) and gsd-security-scanner agent.
 *
 * All functions are synchronous. Files are cached in module scope after first read.
 * Requires: Node.js built-ins only (fs, path) + js-yaml if available (falls back to regex parse).
 */

const fs = require('fs');
const path = require('path');

// ─── Resolve references directory ────────────────────────────────────────────

const REFERENCES_DIR = path.resolve(__dirname, '../../references');
const SEMGREP_LIBRARY_PATH = path.join(REFERENCES_DIR, 'semgrep-rules-library.yml');
const OWASP_FOUNDATION_PATH = path.join(REFERENCES_DIR, 'owasp-top-10-foundation.md');

// Language alias normalization
const LANGUAGE_ALIASES = {
  js: 'javascript',
  ts: 'typescript',
  javascript: 'javascript',
  typescript: 'javascript-typescript',
  'javascript-typescript': 'javascript-typescript',
  py: 'python',
  python: 'python',
  go: 'go',
  golang: 'go',
  rs: 'rust',
  rust: 'rust',
  java: 'java',
  c: 'cpp',
  'c++': 'cpp',
  cpp: 'cpp',
  php: 'php',
};

// Module-level cache
const _cache = {
  patternFiles: {},
  semgrepLibrary: null,
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Parse the semgrep-rules-library.yml into a structured object.
 * This is a purpose-built parser for the known schema of our YAML file.
 * It does NOT attempt to be a general YAML parser.
 *
 * Schema handled:
 *   version: "1.0"
 *   semgrep_cli_pinned: "1.45.0"
 *   community_ruleset_version: "1.42.0"
 *   update_date: "2026-04-16"
 *   rules:
 *     rule-id:
 *       source: "p/security-audit"
 *       owasp: "A03:2021-Injection"
 *       languages: [python]
 *       ...
 *
 * @param {string} content
 * @returns {object}
 */
function _parseYaml(content) {
  const result = { rules: {} };
  const lines = content.split('\n');

  let currentRule = null;
  let inRules = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimEnd();

    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed.trim() === '') continue;

    // Top-level key-only line (e.g. "rules:")
    const keyOnly = trimmed.match(/^([a-zA-Z_]+):\s*(?:#.*)?$/);
    if (keyOnly && !trimmed.startsWith(' ') && !trimmed.startsWith('\t')) {
      if (keyOnly[1] === 'rules') { inRules = true; }
      continue;
    }

    // Top-level scalar fields
    const topLevel = trimmed.match(/^([a-zA-Z_]+):\s*["']?([^"'#\n]+?)["']?\s*(?:#.*)?$/);
    if (topLevel && !trimmed.startsWith(' ') && !trimmed.startsWith('\t')) {
      const key = topLevel[1];
      const val = topLevel[2].trim();
      if (key === 'rules') { inRules = true; } else { result[key] = val; }
      continue;
    }

    if (!inRules) continue;

    // Rule ID line (2-space indent, key ending with colon, no value)
    const ruleIdMatch = trimmed.match(/^  ([a-z][a-z0-9-]+):\s*$/);
    if (ruleIdMatch) {
      currentRule = ruleIdMatch[1];
      result.rules[currentRule] = {};
      continue;
    }

    // Rule field (4-space indent)
    if (currentRule && trimmed.match(/^    [a-zA-Z_]+:/)) {
      const fieldMatch = trimmed.match(/^    ([a-zA-Z_]+):\s*(.*)$/);
      if (fieldMatch) {
        const key = fieldMatch[1];
        let val = fieldMatch[2].trim().replace(/^["']|["']$/g, '');

        // Handle inline arrays: [python] or [javascript, typescript]
        if (val.startsWith('[') && val.endsWith(']')) {
          val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        }
        // Handle boolean-like values
        else if (val === 'true') val = true;
        else if (val === 'false') val = false;
        // Handle numeric
        else if (!isNaN(parseFloat(val)) && val !== '') val = parseFloat(val);

        result.rules[currentRule][key] = val;
      }
    }
  }

  return result;
}

/**
 * Extract OWASP section blocks from a markdown pattern file.
 * Returns array of { id, title, grep_commands, semgrep_rule_ids } objects.
 * @param {string} content
 * @returns {Array<object>}
 */
function _extractOwaspSections(content) {
  const sections = [];
  // Match "### A01:2021 — ..." headings
  const headingRe = /^###\s+(A\d{2}:\d{4}[^\n]*)/gm;
  let match;
  const positions = [];
  while ((match = headingRe.exec(content)) !== null) {
    positions.push({ title: match[1].trim(), index: match.index });
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end = i + 1 < positions.length ? positions[i + 1].index : content.length;
    const sectionText = content.slice(start, end);

    // Extract OWASP ID
    const idMatch = positions[i].title.match(/^(A\d{2}:\d{4})/);
    const id = idMatch ? idMatch[1] : null;

    // Extract grep commands from bash code blocks
    const grepCommands = [];
    const grepRe = /```bash\n([\s\S]*?)```/g;
    let gm;
    while ((gm = grepRe.exec(sectionText)) !== null) {
      const lines = gm[1].split('\n').filter(l => l.trim().startsWith('grep'));
      grepCommands.push(...lines.map(l => l.trim()));
    }

    // Extract semgrep rule IDs referenced (e.g., "Rule: `python-eval-injection`")
    const semgrepRuleIds = [];
    const ruleRefRe = /Rules?:\s*`([^`]+)`/g;
    let rm;
    while ((rm = ruleRefRe.exec(sectionText)) !== null) {
      const ids = rm[1].split(',').map(s => s.trim().replace(/`/g, ''));
      semgrepRuleIds.push(...ids);
    }

    sections.push({
      id,
      title: positions[i].title,
      grep_commands: grepCommands,
      semgrep_rule_ids: semgrepRuleIds,
      raw: sectionText,
    });
  }
  return sections;
}

/**
 * Extract quick reference table rows from markdown.
 * @param {string} content
 * @returns {Array<object>}
 */
function _extractQuickReference(content) {
  const rows = [];
  const tableRe = /\|\s*(A\d{2}[^|]*)\|\s*([^|]*)\|\s*([^|]*)\|/g;
  let m;
  while ((m = tableRe.exec(content)) !== null) {
    rows.push({
      category: m[1].trim(),
      pattern: m[2].trim(),
      grep: m[3].trim(),
    });
  }
  return rows;
}

// ─── Exported Functions ────────────────────────────────────────────────────────

/**
 * Load and parse a language-specific security pattern file.
 *
 * @param {string} language - Language name (e.g., 'python', 'javascript', 'go')
 * @returns {{ language: string, file_path: string, owasp_patterns: Array, quick_reference: Array, raw: string } | null}
 */
function loadPatternFile(language) {
  const normalized = LANGUAGE_ALIASES[language.toLowerCase()] || language.toLowerCase();

  if (_cache.patternFiles[normalized]) {
    return _cache.patternFiles[normalized];
  }

  const filePath = path.join(REFERENCES_DIR, `${normalized}-security-patterns.md`);

  if (!fs.existsSync(filePath)) {
    process.stderr.write(`[pattern-loader] Pattern file not found: ${filePath}\n`);
    return null;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    process.stderr.write(`[pattern-loader] Failed to read ${filePath}: ${err.message}\n`);
    return null;
  }

  const result = {
    language: normalized,
    file_path: filePath,
    owasp_patterns: _extractOwaspSections(content),
    quick_reference: _extractQuickReference(content),
    raw: content,
  };

  _cache.patternFiles[normalized] = result;
  return result;
}

/**
 * Load and parse the master semgrep rules library YAML.
 *
 * @returns {{ semgrep_cli_version: string, community_ruleset_version: string, rules: object } | null}
 */
function loadSemgrepRules() {
  if (_cache.semgrepLibrary) {
    return _cache.semgrepLibrary;
  }

  if (!fs.existsSync(SEMGREP_LIBRARY_PATH)) {
    process.stderr.write(`[pattern-loader] Semgrep library not found: ${SEMGREP_LIBRARY_PATH}\n`);
    return null;
  }

  let content;
  try {
    content = fs.readFileSync(SEMGREP_LIBRARY_PATH, 'utf8');
  } catch (err) {
    process.stderr.write(`[pattern-loader] Failed to read semgrep library: ${err.message}\n`);
    return null;
  }

  const parsed = _parseYaml(content);
  if (!parsed || parsed._parseError) {
    process.stderr.write(`[pattern-loader] YAML parse error: ${parsed ? parsed._parseError : 'null result'}\n`);
    return { _raw: content, rules: {} };
  }

  const result = {
    semgrep_cli_version: parsed.semgrep_cli_pinned || 'unknown',
    community_ruleset_version: parsed.community_ruleset_version || 'unknown',
    update_date: parsed.update_date || null,
    rules: parsed.rules || {},
  };

  _cache.semgrepLibrary = result;
  return result;
}

/**
 * Look up a specific semgrep rule by its ID.
 *
 * @param {string} ruleId - Rule ID (e.g., 'python-eval-injection')
 * @returns {object | null} Rule metadata or null if not found
 */
function getSemgrepRuleById(ruleId) {
  const library = loadSemgrepRules();
  if (!library || !library.rules) {
    return null;
  }
  const rule = library.rules[ruleId];
  if (!rule) {
    process.stderr.write(`[pattern-loader] Rule not found: ${ruleId}\n`);
    return null;
  }
  return { id: ruleId, ...rule };
}

/**
 * Generate grep commands for a specific language and OWASP category.
 *
 * @param {string} language - Language name (e.g., 'python')
 * @param {string} owaspCategory - OWASP category ID (e.g., 'A03:2021')
 * @returns {string[]} Array of grep command strings ready for shell execution
 */
function generateGrepCommand(language, owaspCategory) {
  const patternFile = loadPatternFile(language);
  if (!patternFile) {
    return [];
  }

  // Normalize category: accept 'A03', 'A03:2021', 'A03:2021-Injection', etc.
  const categoryPrefix = owaspCategory.match(/^A\d{2}/)?.[0];
  if (!categoryPrefix) {
    process.stderr.write(`[pattern-loader] Invalid OWASP category: ${owaspCategory}\n`);
    return [];
  }

  const section = patternFile.owasp_patterns.find(s => s.id && s.id.startsWith(categoryPrefix));
  if (!section) {
    return [];
  }

  return section.grep_commands;
}

/**
 * Extract a semgrep YAML rule block from a language pattern file by rule ID.
 * Returns the inline YAML block if present, suitable for piping to semgrep --config.
 *
 * @param {string} patternFilePath - Absolute path to language pattern .md file
 * @param {string} ruleId - Rule ID to extract (e.g., 'python-missing-login-required')
 * @returns {string | null} YAML block content or null if not found
 */
function extractSemgrepRuleBlock(patternFilePath, ruleId) {
  let content;
  try {
    content = fs.readFileSync(patternFilePath, 'utf8');
  } catch (err) {
    process.stderr.write(`[pattern-loader] Cannot read ${patternFilePath}: ${err.message}\n`);
    return null;
  }

  // Look for yaml code block containing the rule id
  const yamlBlockRe = /```ya?ml\n([\s\S]*?)```/g;
  let m;
  while ((m = yamlBlockRe.exec(content)) !== null) {
    if (m[1].includes(`id: ${ruleId}`)) {
      return m[1];
    }
  }

  process.stderr.write(`[pattern-loader] Rule block not found in file: ${ruleId}\n`);
  return null;
}

// ─── Module exports ────────────────────────────────────────────────────────────

module.exports = {
  loadPatternFile,
  loadSemgrepRules,
  getSemgrepRuleById,
  generateGrepCommand,
  extractSemgrepRuleBlock,
};
