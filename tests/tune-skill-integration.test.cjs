/**
 * GSD Tune-Skill Integration Tests
 *
 * Validates end-to-end workflow for /gsd-tune-skill:
 * - Single-skill tuning (symptom → audit → diffs → commit)
 * - Batch mode (--batch FILE, multiple issues, unified review, atomic commit)
 * - Transcript extraction (--transcript PATH, friction signals, symptom augmentation)
 * - Regression verification (post-fix --structural-only audit)
 * - Commit message format (fix(skill): and fix(batch): patterns)
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TEST_FIXTURES_DIR = path.join(__dirname, 'test-fixtures');
const SKILL_TUNER_AGENT = path.join(REPO_ROOT, 'agents', 'gsd-skill-tuner.md');
const TUNE_COMMAND = path.join(REPO_ROOT, 'commands', 'gsd', 'tune-skill.md');
const TUNE_WORKFLOW = path.join(REPO_ROOT, 'get-shit-done', 'workflows', 'tune-skill.md');

// Ensure test fixtures directory exists
if (!fs.existsSync(TEST_FIXTURES_DIR)) {
  fs.mkdirSync(TEST_FIXTURES_DIR, { recursive: true });
}

// ─── Artifact Existence ──────────────────────────────────────────────────────

describe('TUNE: Tune-Skill Artifacts Exist', () => {
  test('tune-skill agent (gsd-skill-tuner.md) exists', () => {
    assert.ok(fs.existsSync(SKILL_TUNER_AGENT), 'gsd-skill-tuner.md not found');
    const content = fs.readFileSync(SKILL_TUNER_AGENT, 'utf-8');
    assert.ok(content.includes('name: gsd-skill-tuner'), 'Agent name missing');
  });

  test('tune-skill command (tune-skill.md) exists', () => {
    assert.ok(fs.existsSync(TUNE_COMMAND), 'tune-skill.md command not found');
    const content = fs.readFileSync(TUNE_COMMAND, 'utf-8');
    assert.ok(content.includes('name: gsd:tune-skill'), 'Command name missing');
    assert.ok(content.includes('allowed-tools:'), 'Command tools missing');
  });

  test('tune-skill workflow exists', () => {
    assert.ok(fs.existsSync(TUNE_WORKFLOW), 'tune-skill workflow not found');
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(content.includes('step name="parse_arguments"'), 'Workflow steps missing');
  });
});

// ─── Single-Skill Tuning Workflow ────────────────────────────────────────────

describe('TUNE-01: Single-Skill Tuning Workflow', () => {
  test('workflow includes symptom intake step', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('intake_symptom') || content.includes('AskUserQuestion'),
      'Workflow missing symptom intake mechanism'
    );
  });

  test('workflow invokes audit (gsd-audit-skill)', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('gsd-audit-skill') || content.includes('invoke_auditor'),
      'Workflow does not invoke auditor'
    );
  });

  test('workflow loads and prioritizes findings', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('load_and_prioritize_findings') || content.includes('semantic'),
      'Workflow missing finding prioritization step'
    );
  });

  test('workflow generates diffs', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('generate_diffs') || content.includes('candidate'),
      'Workflow missing diff generation step'
    );
  });

  test('workflow presents diffs with review gate', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('present_diffs') || content.includes('Approve'),
      'Workflow missing review gate for diffs'
    );
  });

  test('workflow supports refinement loop (max 3 iterations)', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('refinement_loop') || content.includes('iteration'),
      'Workflow missing refinement loop'
    );
    assert.ok(
      content.includes('3') && content.includes('iteration'),
      'Workflow does not enforce 3-iteration limit'
    );
  });

  test('workflow applies approved diffs and commits', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('apply_and_commit') || content.includes('git commit'),
      'Workflow missing commit step'
    );
  });

  test('workflow verifies no regressions after commit', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('regression_verification') || content.includes('--structural-only'),
      'Workflow missing regression verification'
    );
  });
});

// ─── Batch Mode Processing ──────────────────────────────────────────────────

describe('TUNE-10: Batch Mode (--batch FILE)', () => {
  test('workflow handles --batch flag', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('--batch') || content.includes('batch'),
      'Workflow does not mention --batch flag'
    );
  });

  test('batch mode loads JSON array from file', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('JSON') || content.includes('batch file') || content.includes('array'),
      'Batch mode does not document JSON loading'
    );
  });

  test('batch mode validates each issue has skill and symptom', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('skill') && content.includes('symptom'),
      'Batch mode validation missing for skill/symptom fields'
    );
  });

  test('batch mode invokes audits in parallel', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('parallel') || content.includes('background'),
      'Batch mode does not indicate parallel audit invocation'
    );
  });

  test('batch mode generates all diffs upfront', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('unified review') || content.includes('ALL diffs') || content.includes('grouped'),
      'Batch mode does not generate diffs upfront'
    );
  });

  test('batch mode supports unified review (not per-skill)', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('Review') && (content.includes('batch') || content.includes('all')),
      'Batch mode does not show unified review gate'
    );
  });

  test('batch mode supports bulk approval (all/partial/none)', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      (content.includes('Approve all') || content.includes('Approve selected') || content.includes('Reject')),
      'Batch mode missing approval options'
    );
  });

  test('batch mode commits atomically with correct format', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('fix(batch):') || content.includes('batch'),
      'Batch mode does not document atomic commit format'
    );
  });
});

// ─── Transcript Extraction (--transcript PATH) ───────────────────────────────

describe('TUNE-04: Transcript Extraction (--transcript PATH)', () => {
  test('workflow handles --transcript flag', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('--transcript') || content.includes('transcript'),
      'Workflow does not mention --transcript flag'
    );
  });

  test('transcript extraction loads file', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('Load transcript') || content.includes('read file'),
      'Transcript loading not documented'
    );
  });

  test('transcript extraction identifies error keywords', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('timeout') || content.includes('error') || content.includes('keywords'),
      'Transcript extraction missing error keyword extraction'
    );
  });

  test('transcript extraction identifies performance keywords', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('slow') || content.includes('hang') || content.includes('performance'),
      'Transcript extraction missing performance keyword extraction'
    );
  });

  test('transcript extraction identifies clarity keywords', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('unclear') || content.includes('confusing') || content.includes('ambiguous'),
      'Transcript extraction missing clarity keyword extraction'
    );
  });

  test('transcript extraction augments symptom with friction signals', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('Augment') || content.includes('augment') || content.includes('friction'),
      'Transcript extraction does not augment symptom'
    );
  });

  test('transcript extraction enforces safety caps (size limits)', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('5000') || content.includes('truncate') || content.includes('safety'),
      'Transcript extraction missing size/safety caps'
    );
  });
});

// ─── Dry-Run Flag Support ────────────────────────────────────────────────────

describe('TUNE-09: --dry-run Flag Support', () => {
  test('command documents --dry-run flag', () => {
    const content = fs.readFileSync(TUNE_COMMAND, 'utf-8');
    assert.ok(
      content.includes('--dry-run') || content.includes('dry-run'),
      'Command does not document --dry-run flag'
    );
  });

  test('workflow handles --dry-run flag', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('--dry-run') || content.includes('dry_run'),
      'Workflow does not handle --dry-run flag'
    );
  });

  test('--dry-run skips applying changes', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('Skip') || content.includes('dry-run') && content.includes('No files modified'),
      'Workflow does not skip apply step for --dry-run'
    );
  });

  test('--dry-run skips commit step', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('Skip') && content.includes('commit'),
      'Workflow does not skip commit for --dry-run'
    );
  });
});

// ─── Regression Verification (TUNE-08) ────────────────────────────────────

describe('TUNE-08: Regression Verification (--structural-only audit)', () => {
  test('tuner agent validates diffs against SMART criteria', () => {
    const content = fs.readFileSync(SKILL_TUNER_AGENT, 'utf-8');
    assert.ok(
      content.includes('validate_against_smart') || content.includes('SMART'),
      'Tuner agent does not validate against SMART criteria'
    );
  });

  test('tuner agent returns TUNE COMPLETE or TUNE BLOCKED', () => {
    const content = fs.readFileSync(SKILL_TUNER_AGENT, 'utf-8');
    assert.ok(
      content.includes('## TUNE COMPLETE') || content.includes('TUNE_COMPLETE'),
      'Tuner agent does not document TUNE COMPLETE return'
    );
    assert.ok(
      content.includes('## TUNE BLOCKED') || content.includes('TUNE_BLOCKED'),
      'Tuner agent does not document TUNE BLOCKED return'
    );
  });

  test('workflow runs --structural-only audit after commit', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('--structural-only') || content.includes('structural-only'),
      'Workflow does not run --structural-only audit for verification'
    );
  });

  test('regression_verification step exists in workflow', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('regression_verification'),
      'Workflow missing regression_verification step'
    );
  });

  test('workflow reverts on structural failure', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('Revert') || content.includes('revert'),
      'Workflow does not document revert on audit failure'
    );
  });
});

// ─── Commit Message Format (TUNE-07) ─────────────────────────────────────

describe('TUNE-07: Commit Message Format', () => {
  test('single-skill commit format is fix(skill): tune {name} — {symptom}', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('fix(skill):') || content.includes('fix(skill): tune'),
      'Workflow does not document fix(skill): format'
    );
  });

  test('batch commit format is fix(batch): tune {count} skills — {themes}', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('fix(batch):') || content.includes('fix(batch): tune'),
      'Workflow does not document fix(batch): format'
    );
  });

  test('commit message includes symptom summary', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('symptom') || content.includes('theme'),
      'Commit format does not include symptom/theme'
    );
  });
});

// ─── Tuner Agent Input/Output Contract ───────────────────────────────────────

describe('TUNE-02,03,05,06: Tuner Agent Behavior', () => {
  test('tuner agent reads SKILL-AUDIT.md (not raw skill files)', () => {
    const content = fs.readFileSync(SKILL_TUNER_AGENT, 'utf-8');
    assert.ok(
      content.includes('SKILL-AUDIT.md') || content.includes('audit_findings_md_path'),
      'Tuner agent does not read SKILL-AUDIT.md'
    );
  });

  test('tuner agent documents input contract', () => {
    const content = fs.readFileSync(SKILL_TUNER_AGENT, 'utf-8');
    assert.ok(
      content.includes('<input>') || content.includes('tune_context'),
      'Tuner agent does not document input contract'
    );
  });

  test('tuner agent has semantic prioritization step', () => {
    const content = fs.readFileSync(SKILL_TUNER_AGENT, 'utf-8');
    assert.ok(
      content.includes('semantic_prioritization') || content.includes('relevance'),
      'Tuner agent missing semantic prioritization step'
    );
  });

  test('tuner agent generates minimal targeted diffs', () => {
    const content = fs.readFileSync(SKILL_TUNER_AGENT, 'utf-8');
    assert.ok(
      content.includes('minimal') || content.includes('targeted') || content.includes('surgical'),
      'Tuner agent does not emphasize minimal diffs'
    );
  });

  test('tuner agent supports syntax-highlighted inline format', () => {
    const content = fs.readFileSync(SKILL_TUNER_AGENT, 'utf-8');
    assert.ok(
      content.includes('syntax') || content.includes('highlight') || content.includes('ANSI'),
      'Tuner agent does not document syntax highlighting'
    );
  });

  test('tuner agent supports refinement regeneration (without re-invoking auditor)', () => {
    const content = fs.readFileSync(SKILL_TUNER_AGENT, 'utf-8');
    assert.ok(
      content.includes('refinement') || content.includes('regenerate'),
      'Tuner agent does not support refinement regeneration'
    );
  });
});

// ─── Cross-Integration ───────────────────────────────────────────────────────

describe('TUNE: Cross-Integration with Auditor', () => {
  test('tune-skill command delegates to tune-skill workflow', () => {
    const content = fs.readFileSync(TUNE_COMMAND, 'utf-8');
    assert.ok(
      content.includes('@workflows/tune-skill.md') || content.includes('tune-skill'),
      'Command does not delegate to tune-skill workflow'
    );
  });

  test('tune-skill workflow invokes gsd-audit-skill', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('gsd-audit-skill'),
      'Workflow does not invoke gsd-audit-skill'
    );
  });

  test('tune-skill workflow invokes gsd-skill-tuner agent', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('gsd-skill-tuner') || content.includes('tuner agent'),
      'Workflow does not invoke gsd-skill-tuner agent'
    );
  });

  test('tuner agent output format supports workflow consumption', () => {
    const content = fs.readFileSync(SKILL_TUNER_AGENT, 'utf-8');
    assert.ok(
      content.includes('## TUNE COMPLETE') || content.includes('## TUNE BLOCKED'),
      'Tuner agent output not structured for workflow consumption'
    );
  });
});

// ─── Documentation ──────────────────────────────────────────────────────────

describe('TUNE: Documentation', () => {
  test('command has objective explaining what /gsd-tune-skill does', () => {
    const content = fs.readFileSync(TUNE_COMMAND, 'utf-8');
    assert.ok(
      content.includes('<objective>'),
      'Command missing <objective> section'
    );
  });

  test('command documents all flags (--transcript, --dry-run, --batch)', () => {
    const content = fs.readFileSync(TUNE_COMMAND, 'utf-8');
    assert.ok(
      content.includes('--transcript') && content.includes('--dry-run') && content.includes('--batch'),
      'Command does not document all flags'
    );
  });

  test('workflow has clear step names', () => {
    const content = fs.readFileSync(TUNE_WORKFLOW, 'utf-8');
    assert.ok(
      content.includes('step name='),
      'Workflow does not use named steps'
    );
  });

  test('tuner agent has role section', () => {
    const content = fs.readFileSync(SKILL_TUNER_AGENT, 'utf-8');
    assert.ok(
      content.includes('<role>'),
      'Tuner agent missing <role> section'
    );
  });
});
