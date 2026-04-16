"use strict";
/**
 * tests/threat-patterns-validation.test.cjs
 * Integration tests for get-shit-done/semgrep/threat-patterns.yml
 * Phase 8, Plan 1 — THR-01 to THR-05
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

const RULE_FILE = path.join(__dirname, "..", "get-shit-done", "semgrep", "threat-patterns.yml");
const FIXTURES_DIR = path.join(__dirname, "fixtures", "threat-patterns");

const REQUIRED_CATEGORIES = ["backdoor", "exfil", "supply_chain", "logic_bomb", "obfuscation", "osint"];
const REQUIRED_FIELDS = ["category", "severity", "seed"];
const MIN_RULE_COUNT = 22;

/** Check if semgrep is available */
function semgrepAvailable() {
  const r = spawnSync("semgrep", ["--version"], { encoding: "utf8" });
  return r.status === 0;
}

/** Parse rule IDs from the YAML (simple regex approach — avoids yaml dep) */
function parseRuleIds(content) {
  const ids = [];
  for (const m of content.matchAll(/^\s{2}-\s+id:\s+(.+)$/gm)) {
    ids.push(m[1].trim());
  }
  return ids;
}

/** Parse metadata fields for each rule */
function parseRuleMetadata(content) {
  const rules = [];
  const ruleBlocks = content.split(/^\s{2}-\s+id:/m).slice(1);
  for (const block of ruleBlocks) {
    const idMatch = block.match(/^(.+)\n/);
    const id = idMatch ? idMatch[1].trim() : "unknown";
    const category = (block.match(/category:\s*(.+)/) || [])[1]?.trim();
    const severity = (block.match(/severity:\s*(\S+)/) || [])[1]?.trim();
    const seed = (block.match(/seed:\s*(.+)/) || [])[1]?.trim();
    rules.push({ id, category, severity, seed });
  }
  return rules;
}

describe("threat-patterns.yml — structure validation", () => {
  let content;
  let ruleIds;
  let ruleMetadata;

  before(() => {
    assert.ok(fs.existsSync(RULE_FILE), `Rule file not found: ${RULE_FILE}`);
    content = fs.readFileSync(RULE_FILE, "utf8");
    ruleIds = parseRuleIds(content);
    ruleMetadata = parseRuleMetadata(content);
  });

  it("file exists and is non-empty", () => {
    assert.ok(content.length > 100, "Rule file is too short");
  });

  it("file starts with 'rules:' block", () => {
    assert.ok(content.includes("rules:"), "Missing top-level 'rules:' key");
  });

  it(`has at least ${MIN_RULE_COUNT} rules`, () => {
    assert.ok(
      ruleIds.length >= MIN_RULE_COUNT,
      `Expected >= ${MIN_RULE_COUNT} rules, found ${ruleIds.length}: ${ruleIds.join(", ")}`
    );
  });

  it("all rule IDs follow thr-<category>-<name> convention", () => {
    for (const id of ruleIds) {
      assert.ok(id.startsWith("thr-"), `Rule ID '${id}' does not start with 'thr-'`);
    }
  });

  it("all rules have required metadata fields (category, severity, seed)", () => {
    for (const rule of ruleMetadata) {
      for (const field of REQUIRED_FIELDS) {
        const value = rule[field];
        assert.ok(value && value !== "undefined", `Rule '${rule.id}' missing metadata.${field}`);
      }
    }
  });

  it("all metadata.category values are valid", () => {
    for (const rule of ruleMetadata) {
      assert.ok(
        REQUIRED_CATEGORIES.includes(rule.category),
        `Rule '${rule.id}' has unknown category: '${rule.category}'`
      );
    }
  });

  it("all metadata.seed values reference SEED-008", () => {
    for (const rule of ruleMetadata) {
      assert.strictEqual(rule.seed, "SEED-008", `Rule '${rule.id}' has wrong seed: '${rule.seed}'`);
    }
  });

  it("each required category has at least 2 rules", () => {
    for (const cat of REQUIRED_CATEGORIES) {
      const count = ruleMetadata.filter((r) => r.category === cat).length;
      assert.ok(count >= 2, `Category '${cat}' has only ${count} rules (need >= 2)`);
    }
  });

  it("has at least 3 rules in category: supply_chain", () => {
    const count = ruleMetadata.filter((r) => r.category === "supply_chain").length;
    assert.ok(count >= 3, `Expected >= 3 supply_chain rules, found ${count}`);
  });

  it("has at least 3 rules in category: obfuscation", () => {
    const count = ruleMetadata.filter((r) => r.category === "obfuscation").length;
    assert.ok(count >= 3, `Expected >= 3 obfuscation rules, found ${count}`);
  });
});

describe("threat-patterns.yml — semgrep validation (requires semgrep CLI)", function () {
  this.timeout(60000);

  before(function () {
    if (!semgrepAvailable()) {
      this.skip(); // semgrep not installed — skip semgrep-dependent tests
    }
  });

  it("passes semgrep --validate", () => {
    const result = spawnSync(
      "semgrep",
      ["--validate", "--config", RULE_FILE],
      { encoding: "utf8" }
    );
    assert.strictEqual(
      result.status,
      0,
      `semgrep --validate failed:\n${result.stdout}\n${result.stderr}`
    );
  });

  it("malicious-base64-eval.js triggers obfuscation rules", () => {
    const fixture = path.join(FIXTURES_DIR, "malicious-base64-eval.js");
    const result = spawnSync(
      "semgrep",
      ["--json", "--config", RULE_FILE, fixture],
      { encoding: "utf8" }
    );
    const output = JSON.parse(result.stdout || "{}");
    const findings = output.results || [];
    assert.ok(
      findings.length > 0,
      `Expected findings in malicious-base64-eval.js, got 0`
    );
  });

  it("benign-base64.js produces 0 findings from obfuscation rules", () => {
    const fixture = path.join(FIXTURES_DIR, "benign-base64.js");
    const result = spawnSync(
      "semgrep",
      ["--json", "--config", RULE_FILE, fixture],
      { encoding: "utf8" }
    );
    const output = JSON.parse(result.stdout || "{}");
    const findings = (output.results || []).filter(
      (f) => f.extra?.metadata?.category === "obfuscation"
    );
    assert.strictEqual(
      findings.length,
      0,
      `Unexpected obfuscation findings in benign-base64.js: ${JSON.stringify(findings)}`
    );
  });

  it("malicious-reverse-shell.py triggers backdoor rules", () => {
    const fixture = path.join(FIXTURES_DIR, "malicious-reverse-shell.py");
    const result = spawnSync(
      "semgrep",
      ["--json", "--config", RULE_FILE, fixture],
      { encoding: "utf8" }
    );
    const output = JSON.parse(result.stdout || "{}");
    const findings = (output.results || []).filter(
      (f) => f.extra?.metadata?.category === "backdoor"
    );
    assert.ok(
      findings.length > 0,
      `Expected backdoor findings in malicious-reverse-shell.py, got 0`
    );
  });

  it("benign-subprocess.py produces 0 backdoor findings", () => {
    const fixture = path.join(FIXTURES_DIR, "benign-subprocess.py");
    const result = spawnSync(
      "semgrep",
      ["--json", "--config", RULE_FILE, fixture],
      { encoding: "utf8" }
    );
    const output = JSON.parse(result.stdout || "{}");
    const findings = (output.results || []).filter(
      (f) => f.extra?.metadata?.category === "backdoor"
    );
    assert.strictEqual(
      findings.length,
      0,
      `Unexpected backdoor findings in benign-subprocess.py: ${JSON.stringify(findings)}`
    );
  });

  it("malicious-setup-cmdclass.py triggers supply_chain rules", () => {
    const fixture = path.join(FIXTURES_DIR, "malicious-setup-cmdclass.py");
    const result = spawnSync(
      "semgrep",
      ["--json", "--config", RULE_FILE, fixture],
      { encoding: "utf8" }
    );
    const output = JSON.parse(result.stdout || "{}");
    const findings = (output.results || []).filter(
      (f) => f.extra?.metadata?.category === "supply_chain" || f.extra?.metadata?.category === "exfil"
    );
    assert.ok(
      findings.length > 0,
      `Expected supply_chain/exfil findings in malicious-setup-cmdclass.py, got 0`
    );
  });

  it("malicious-osint-harvest.py triggers osint rules", () => {
    const fixture = path.join(FIXTURES_DIR, "malicious-osint-harvest.py");
    const result = spawnSync(
      "semgrep",
      ["--json", "--config", RULE_FILE, fixture],
      { encoding: "utf8" }
    );
    const output = JSON.parse(result.stdout || "{}");
    const findings = (output.results || []).filter(
      (f) => f.extra?.metadata?.category === "osint"
    );
    assert.ok(
      findings.length > 0,
      `Expected osint findings in malicious-osint-harvest.py, got 0`
    );
  });

  it("benign-env-access.py produces 0 osint findings", () => {
    const fixture = path.join(FIXTURES_DIR, "benign-env-access.py");
    const result = spawnSync(
      "semgrep",
      ["--json", "--config", RULE_FILE, fixture],
      { encoding: "utf8" }
    );
    const output = JSON.parse(result.stdout || "{}");
    const findings = (output.results || []).filter(
      (f) => f.extra?.metadata?.category === "osint"
    );
    assert.strictEqual(
      findings.length,
      0,
      `Unexpected osint findings in benign-env-access.py: ${JSON.stringify(findings)}`
    );
  });

  it("malicious-logic-bomb.js triggers logic_bomb rules", () => {
    const fixture = path.join(FIXTURES_DIR, "malicious-logic-bomb.js");
    const result = spawnSync(
      "semgrep",
      ["--json", "--config", RULE_FILE, fixture],
      { encoding: "utf8" }
    );
    const output = JSON.parse(result.stdout || "{}");
    const findings = (output.results || []).filter(
      (f) => f.extra?.metadata?.category === "logic_bomb"
    );
    assert.ok(
      findings.length > 0,
      `Expected logic_bomb findings in malicious-logic-bomb.js, got 0`
    );
  });

  it("all findings from malicious fixtures have required metadata fields", () => {
    const maliciousFixtures = [
      "malicious-base64-eval.js",
      "malicious-reverse-shell.py",
      "malicious-setup-cmdclass.py",
      "malicious-osint-harvest.py",
      "malicious-logic-bomb.js",
      "malicious-postinstall.js",
    ];

    for (const fixture of maliciousFixtures) {
      const fixturePath = path.join(FIXTURES_DIR, fixture);
      if (!fs.existsSync(fixturePath)) continue;

      const result = spawnSync(
        "semgrep",
        ["--json", "--config", RULE_FILE, fixturePath],
        { encoding: "utf8" }
      );
      const output = JSON.parse(result.stdout || "{}");
      const findings = output.results || [];

      for (const finding of findings) {
        const meta = finding.extra?.metadata || {};
        assert.ok(meta.category, `Finding in ${fixture} missing metadata.category`);
        assert.ok(meta.severity, `Finding in ${fixture} missing metadata.severity`);
        assert.ok(meta.seed, `Finding in ${fixture} missing metadata.seed`);
      }
    }
  });
});

describe("threat-patterns.yml — fixture file existence", () => {
  const expectedFixtures = [
    "malicious-base64-eval.js",
    "benign-base64.js",
    "malicious-reverse-shell.py",
    "benign-subprocess.py",
    "malicious-postinstall.js",
    "benign-postinstall.js",
    "malicious-setup-cmdclass.py",
    "malicious-logic-bomb.js",
    "malicious-osint-harvest.py",
    "benign-env-access.py",
  ];

  for (const fixture of expectedFixtures) {
    it(`fixture exists: ${fixture}`, () => {
      const p = path.join(FIXTURES_DIR, fixture);
      assert.ok(fs.existsSync(p), `Missing fixture: ${p}`);
    });
  }
});
