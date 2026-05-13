const fs = require('fs');
const path = require('path');

const filePath = '.planning/phases/01-shared-infrastructure/01-02-PLAN.md';
let c = fs.readFileSync(filePath, 'utf-8');

// ── Change 1: interfaces section — Required describe blocks ──────────────────
const OLD_BLOCKS = `Required describe blocks (in this order):
  1. 'FRONTMATTER: required keys'       — name:, description:, allowed-tools: present
  2. 'STRUCTURE: required XML tags'     — <objective> and <process> present
  3. 'STRUCTURE: execution_context'     — if <execution_context> present: paths use @~/.copilot/, not @~/.claude/
  4. 'ANTIPATTERN: no hardcoded paths'  — /~\\/\\.claude\\//.test(content) must be false
  5. 'ANTIPATTERN: no heredoc patterns' — /cat\\s+<<\\s*'?EOF'?/ must not appear in non-comment lines`;

const NEW_BLOCKS = `Required describe blocks (in this order):
  1. 'FRONTMATTER: required keys'           — name:, description:, allowed-tools: present
  2. 'STRUCTURE: required XML tags'         — <objective> and <process> present
  3. 'STRUCTURE: execution_context'         — if <execution_context> present:
                                              (a) paths use @~/.copilot/, not @~/.claude/
                                              (b) @-paths resolve to existing files (fs.existsSync)
  4. 'STRUCTURE: text_mode in runtime_note' — if <runtime_note> present: text_mode must appear
  5. 'ANTIPATTERN: no hardcoded paths'      — /~\\/\\.claude\\//.test(content) must be false
  6. 'ANTIPATTERN: no heredoc patterns'     — /cat\\s+<<\\s*'?EOF'?/ must not appear in non-comment lines

Key pitfall — path existence resolution:
  @-path references look like \`@~/.copilot/get-shit-done/workflows/execute-plan.md\`.
  To check existence: strip the \`@\` prefix, replace \`~\` with \`os.homedir()\`, then \`fs.existsSync()\`.
  Extract all \`@\`-paths from the \`<execution_context>\` block (lines starting with \`@\`).`;

if (!c.includes(OLD_BLOCKS)) { console.error('CHANGE 1 NOT FOUND'); process.exit(1); }
c = c.replace(OLD_BLOCKS, NEW_BLOCKS);
console.log('Change 1 applied');

// ── Change 2a: rename Section 3 heading ──────────────────────────────────────
const OLD_S3_HEADING = '**Section 3 — Structure: execution_context format:**';
const NEW_S3_HEADING = '**Section 3 — Structure: execution_context (format + path existence):**';
if (!c.includes(OLD_S3_HEADING)) { console.error('CHANGE 2a NOT FOUND'); process.exit(1); }
c = c.replace(OLD_S3_HEADING, NEW_S3_HEADING);
console.log('Change 2a applied');

// ── Change 2b: replace old section 3 code block body ─────────────────────────
const OLD_S3_CODE = `\`\`\`javascript
// ─── Structure: Execution Context Format ─────────────────────────────────────

describe('STRUCTURE: execution_context format', () => {
  for (const skill of ALL_SKILLS) {
    test(\`\${skill} execution_context uses @~/.copilot/ pattern (if present)\`, () => {
      const content = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf-8');
      if (!content.includes('<execution_context>')) return; // optional — skip if absent
      checkSkill(
        skill,
        () => assert.ok(
          !content.includes('@~/.claude/'),
          \`\${skill} <execution_context> uses @~/.claude/ — must use @~/.copilot/\`
        ),
        '<execution_context> uses @~/.claude/ instead of @~/.copilot/'
      );
    });
  }
});
\`\`\``;

const NEW_S3_CODE = `\`\`\`javascript
// ─── Structure: Execution Context ────────────────────────────────────────────

describe('STRUCTURE: execution_context', () => {
  for (const skill of ALL_SKILLS) {
    test(\`\${skill} execution_context valid (if present)\`, () => {
      const content = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf-8');
      if (!content.includes('<execution_context>')) return; // optional — skip if absent

      // Check: no @~/.claude/ paths (wrong platform)
      checkSkill(
        skill,
        () => assert.ok(
          !content.includes('@~/.claude/'),
          \`\${skill} <execution_context> uses @~/.claude/ — must use @~/.copilot/\`
        ),
        '<execution_context> uses @~/.claude/ instead of @~/.copilot/'
      );

      // Check: @-path references resolve to existing files
      const execCtxMatch = content.match(/<execution_context>([\\s\\S]*?)<\\/execution_context>/);
      if (!execCtxMatch) return;
      const atPaths = execCtxMatch[1]
        .split('\\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('@'));
      for (const atPath of atPaths) {
        const resolved = atPath.slice(1).replace(/^~/, os.homedir());
        checkSkill(
          skill,
          () => assert.ok(
            fs.existsSync(resolved),
            \`\${skill} <execution_context> path does not exist: \${atPath}\`
          ),
          \`<execution_context> path does not exist: \${atPath}\`
        );
      }
    });
  }
});
\`\`\`

**Section 4 — Structure: text_mode in runtime_note:**
\`\`\`javascript
// ─── Structure: text_mode in runtime_note ────────────────────────────────────

describe('STRUCTURE: text_mode in runtime_note', () => {
  for (const skill of ALL_SKILLS) {
    test(\`\${skill} has text_mode handling if <runtime_note> present\`, () => {
      const content = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf-8');
      if (!content.includes('<runtime_note>')) return; // optional — skip if absent
      checkSkill(
        skill,
        () => assert.ok(
          content.includes('text_mode') || content.includes('TEXT_MODE'),
          \`\${skill} has <runtime_note> but no text_mode handling — add text_mode fallback per D-05\`
        ),
        'has <runtime_note> but missing text_mode handling'
      );
    });
  }
});
\`\`\``;

if (!c.includes(OLD_S3_CODE)) { console.error('CHANGE 2b NOT FOUND'); process.exit(1); }
c = c.replace(OLD_S3_CODE, NEW_S3_CODE);
console.log('Change 2b applied');

// ── Change 2c: renumber Section 4 → Section 5 ────────────────────────────────
const OLD_S4_HEADING = '**Section 4 — Anti-pattern: hardcoded paths:**';
const NEW_S4_HEADING = '**Section 5 — Anti-pattern: hardcoded paths:**';
if (!c.includes(OLD_S4_HEADING)) { console.error('CHANGE 2c NOT FOUND'); process.exit(1); }
c = c.replace(OLD_S4_HEADING, NEW_S4_HEADING);
console.log('Change 2c applied');

// ── Change 2d: renumber Section 5 → Section 6 ────────────────────────────────
const OLD_S5_HEADING = '**Section 5 — Anti-pattern: heredoc patterns:**';
const NEW_S5_HEADING = '**Section 6 — Anti-pattern: heredoc patterns:**';
if (!c.includes(OLD_S5_HEADING)) { console.error('CHANGE 2d NOT FOUND'); process.exit(1); }
c = c.replace(OLD_S5_HEADING, NEW_S5_HEADING);
console.log('Change 2d applied');

// ── Change 3: done section ────────────────────────────────────────────────────
const OLD_DONE = `  - Contains exactly 5 describe blocks: FRONTMATTER, STRUCTURE (×2), ANTIPATTERN (×2)
  - Checks \`allowed-tools:\` (NOT \`tools:\`)
  - execution_context check is conditional (\`if (!content.includes('<execution_context>')) return\`)
  - Heredoc check skips lines with \`never use\` / \`NEVER\``;

const NEW_DONE = `  - Contains exactly 6 describe blocks: FRONTMATTER, STRUCTURE (×3), ANTIPATTERN (×2)
  - Checks \`allowed-tools:\` (NOT \`tools:\`)
  - execution_context check is conditional (\`if (!content.includes('<execution_context>')) return\`)
  - execution_context check validates @-paths with \`fs.existsSync\`
  - text_mode describe block present (checks \`<runtime_note>\` skills)
  - Heredoc check skips lines with \`never use\` / \`NEVER\``;

if (!c.includes(OLD_DONE)) { console.error('CHANGE 3 NOT FOUND'); process.exit(1); }
c = c.replace(OLD_DONE, NEW_DONE);
console.log('Change 3 applied');

// ── Change 4: verification section ───────────────────────────────────────────
const OLD_VERIFY = `4. \`Select-String -Path tests/skill-audit-conventions.test.cjs -Pattern "allowed-tools"\` returns a match (not "tools:")
5. \`Select-String -Path tests/skill-audit-conventions.test.cjs -Pattern "tools:"\` returns NO match (would be wrong field name)
</verification>`;

const NEW_VERIFY = `4. \`Select-String -Path tests/skill-audit-conventions.test.cjs -Pattern "allowed-tools"\` returns a match (not "tools:")
5. \`Select-String -Path tests/skill-audit-conventions.test.cjs -Pattern "existsSync"\` returns a match (path existence check)
6. \`Select-String -Path tests/skill-audit-conventions.test.cjs -Pattern "text_mode"\` returns a match (text_mode describe block)
7. \`Select-String -Path tests/skill-audit-conventions.test.cjs -Pattern "tools:"\` returns NO match (would be wrong field name)
</verification>`;

if (!c.includes(OLD_VERIFY)) { console.error('CHANGE 4 NOT FOUND'); process.exit(1); }
c = c.replace(OLD_VERIFY, NEW_VERIFY);
console.log('Change 4 applied');

// ── Change 5: success_criteria section ───────────────────────────────────────
const OLD_SC = `- All 5 describe blocks present
- execution_context check is conditional`;

const NEW_SC = `- All 6 describe blocks present (FRONTMATTER, STRUCTURE ×3, ANTIPATTERN ×2)
- execution_context check validates @-paths with fs.existsSync
- text_mode describe block present
- execution_context check is conditional`;

if (!c.includes(OLD_SC)) { console.error('CHANGE 5 NOT FOUND'); process.exit(1); }
c = c.replace(OLD_SC, NEW_SC);
console.log('Change 5 applied');

// ── Write back ────────────────────────────────────────────────────────────────
fs.writeFileSync(filePath, c, 'utf-8');
console.log('File written successfully. Length:', c.length);
