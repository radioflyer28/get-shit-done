'use strict';

/**
 * skill-audit-conventions.test.cjs
 *
 * Deterministic structural checks for GSD skills.
 *
 * Scope (per CONTEXT.md D-06): Only V1_SKILLS fail CI.
 * Legacy installed skills get console.warn — not assert.fail.
 *
 * V1_SKILLS is empty in Phase 1. Phase 4 populates it when new skills are created.
 * Skills dir: process.env.GSD_SKILLS_DIR || ~/.copilot/skills/
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILLS_DIR = process.env.GSD_SKILLS_DIR
  || path.join(os.homedir(), '.copilot', 'skills');

// v1 skills from this milestone — must pass (not just warn). Empty until Phase 4.
const V1_SKILLS = [];

const ALL_SKILLS = fs.existsSync(SKILLS_DIR)
  ? fs.readdirSync(SKILLS_DIR).filter(d =>
      fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()
      && fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md'))
    )
  : [];

function checkSkill(skillName, checkFn, message) {
  const isV1 = V1_SKILLS.includes(skillName);
  try {
    checkFn();
  } catch (err) {
    if (isV1) throw err;
    console.warn(`[LEGACY] ${skillName}: ${message}`);
  }
}

// ─── Frontmatter: Required Keys ──────────────────────────────────────────────

describe('FRONTMATTER: required keys', () => {
  for (const skill of ALL_SKILLS) {
    test(`${skill} has name, description, allowed-tools`, () => {
      const content = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf-8');
      const frontmatter = content.split('---')[1] || '';
      checkSkill(skill, () => assert.ok(frontmatter.includes('name:'), `${skill} missing name:`), 'missing name:');
      checkSkill(skill, () => assert.ok(frontmatter.includes('description:'), `${skill} missing description:`), 'missing description:');
      checkSkill(skill, () => assert.ok(frontmatter.includes('allowed-tools:'), `${skill} missing allowed-tools:`), 'missing allowed-tools:');
    });
  }
});

// ─── Structure: Required XML Tags ────────────────────────────────────────────

describe('STRUCTURE: required XML tags', () => {
  for (const skill of ALL_SKILLS) {
    test(`${skill} has <objective> and <process>`, () => {
      const content = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf-8');
      checkSkill(skill, () => assert.ok(content.includes('<objective>'), `${skill} missing <objective>`), 'missing <objective>');
      checkSkill(skill, () => assert.ok(content.includes('<process>'), `${skill} missing <process>`), 'missing <process>');
    });
  }
});

// ─── Structure: Execution Context ────────────────────────────────────────────

describe('STRUCTURE: execution_context', () => {
  for (const skill of ALL_SKILLS) {
    test(`${skill} execution_context valid (if present)`, () => {
      const content = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf-8');
      if (!content.includes('<execution_context>')) return; // optional — skip if absent

      // Check: no @~/.claude/ paths (wrong platform)
      checkSkill(
        skill,
        () => assert.ok(
          !content.includes('@~/.claude/'),
          `${skill} <execution_context> uses @~/.claude/ — must use @~/.copilot/`
        ),
        '<execution_context> uses @~/.claude/ instead of @~/.copilot/'
      );

      // Check: @-path references resolve to existing files
      const execCtxMatch = content.match(/<execution_context>([\s\S]*?)<\/execution_context>/);
      if (!execCtxMatch) return;
      const atPaths = execCtxMatch[1]
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('@'));
      for (const atPath of atPaths) {
        const resolved = atPath.slice(1).replace(/^~/, os.homedir());
        checkSkill(
          skill,
          () => assert.ok(
            fs.existsSync(resolved),
            `${skill} <execution_context> path does not exist: ${atPath}`
          ),
          `<execution_context> path does not exist: ${atPath}`
        );
      }
    });
  }
});

// ─── Structure: text_mode in runtime_note ────────────────────────────────────

describe('STRUCTURE: text_mode in runtime_note', () => {
  for (const skill of ALL_SKILLS) {
    test(`${skill} has text_mode handling if <runtime_note> present`, () => {
      const content = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf-8');
      if (!content.includes('<runtime_note>')) return; // optional — skip if absent
      checkSkill(
        skill,
        () => assert.ok(
          content.includes('text_mode') || content.includes('TEXT_MODE'),
          `${skill} has <runtime_note> but no text_mode handling — add text_mode fallback per D-05`
        ),
        'has <runtime_note> but missing text_mode handling'
      );
    });
  }
});

// ─── Anti-pattern: Hardcoded ~/.claude/ Paths ────────────────────────────────

describe('ANTIPATTERN: no hardcoded ~/.claude/ paths', () => {
  const HARDCODED_CLAUDE = /~\/\.claude\//;
  for (const skill of ALL_SKILLS) {
    test(`${skill} has no hardcoded ~/.claude/ paths`, () => {
      const content = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf-8');
      checkSkill(
        skill,
        () => assert.ok(
          !HARDCODED_CLAUDE.test(content),
          `${skill} contains hardcoded ~/.claude/ path — use ~/.copilot/ or runtime path`
        ),
        'contains hardcoded ~/.claude/ path'
      );
    });
  }
});

// ─── Anti-pattern: Heredoc Patterns ──────────────────────────────────────────

describe('ANTIPATTERN: no heredoc patterns', () => {
  const HEREDOC = /cat\s+<<\s*'?EOF'?/;
  for (const skill of ALL_SKILLS) {
    test(`${skill} has no active heredoc patterns`, () => {
      const content = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip lines that are anti-heredoc instruction text (false positive source)
        if (line.includes('never use') || line.includes('NEVER')) continue;
        if (line.trim().startsWith('```')) continue;
        checkSkill(
          skill,
          () => assert.ok(
            !HEREDOC.test(line),
            `${skill}:${i + 1} has active heredoc pattern: ${line.trim()}`
          ),
          `line ${i + 1} has heredoc pattern`
        );
      }
    });
  }
});
