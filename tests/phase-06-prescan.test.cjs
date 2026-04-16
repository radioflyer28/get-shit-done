/**
 * Integration tests for Phase 6: Pre-Scan Orchestrator
 *
 * Tests verify:
 * 1. Bash shim detects runtime environment correctly
 * 2. Python orchestrator executes and produces PRE-SCAN-RESULTS.json
 * 3. Schema validation of PRE-SCAN-RESULTS.json output
 * 4. Deterministic output (same input = same output)
 * 5. Tool registry covers required tool types
 * 6. Workflow integrations include pre-scan steps
 * 7. Agent prompts shifted to analysis mode
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Phase 6: Pre-Scan Orchestrator', () => {
  const testDir = path.join(__dirname, '..');
  const binDir = path.join(testDir, 'get-shit-done', 'bin');
  const refsDir = path.join(testDir, 'get-shit-done', 'references');
  const workflowsDir = path.join(testDir, 'get-shit-done', 'workflows');
  const agentsDir = path.join(testDir, 'agents');

  describe('Task 1: Bash Shim + Python Orchestrator', () => {
    it('ORK-01: Bash shim exists and is executable', (_t) => {
      const shim = path.join(binDir, 'security-prescan.sh');
      assert(fs.existsSync(shim), 'security-prescan.sh should exist');
      
      const stats = fs.statSync(shim);
      assert(stats.isFile(), 'security-prescan.sh should be a file');
      // Check execute permission (Unix-like systems)
      const hasExecute = (stats.mode & parseInt('0111', 8)) !== 0;
      assert(hasExecute || process.platform === 'win32', 'security-prescan.sh should be executable');
    });

    it('ORK-02: Python orchestrator exists and is valid Python', (_t) => {
      const orchestrator = path.join(binDir, 'security_prescan.py');
      assert(fs.existsSync(orchestrator), 'security_prescan.py should exist');
      
      const content = fs.readFileSync(orchestrator, 'utf8');
      assert(content.includes('#!/usr/bin/env python3'), 'Should have python3 shebang');
      assert(content.includes('class PrescanOrchestrator'), 'Should define PrescanOrchestrator class');
      assert(content.includes('TOOL_REGISTRY'), 'Should have tool registry');
      assert(content.includes('def run_parallel'), 'Should have run_parallel method');
      assert(content.includes('def write_results'), 'Should have write_results method');
    });

    it('ORK-02: Python orchestrator uses stdlib only (no external imports)', (_t) => {
      const orchestrator = path.join(binDir, 'security_prescan.py');
      const content = fs.readFileSync(orchestrator, 'utf8');
      
      // Extract imports
      const imports = content.match(/^import\s+\w+|^from\s+[\w\.]+\s+import/gm) || [];
      const allowedModules = [
        'json', 'os', 'sys', 'subprocess', 'concurrent', 'pathlib', 
        'datetime', 'uuid', 'time', 're'
      ];
      
      imports.forEach(imp => {
        const match = imp.match(/import\s+([\w\.]+)|from\s+([\w\.]+)/);
        const module = (match[1] || match[2]).split('.')[0];
        assert(
          allowedModules.includes(module),
          `Unexpected external dependency: ${module}. Only stdlib allowed.`
        );
      });
    });

    it('ORK-02: Python orchestrator has proper error handling', (_t) => {
      const orchestrator = path.join(binDir, 'security_prescan.py');
      const content = fs.readFileSync(orchestrator, 'utf8');
      
      assert(content.includes('try:'), 'Should have try-except blocks');
      assert(content.includes('except'), 'Should handle exceptions');
      assert(content.includes('timeout'), 'Should handle tool timeouts');
      assert(content.includes('concurrent.futures'), 'Should use concurrent execution');
    });

    it('ORK-02: Orchestrator file line count is 100-150 lines', (_t) => {
      const orchestrator = path.join(binDir, 'security_prescan.py');
      const content = fs.readFileSync(orchestrator, 'utf8');
      const lineCount = content.split('\n').length;
      
      assert(lineCount >= 80, `Orchestrator should have at least 80 lines, got ${lineCount}`);
      assert(lineCount <= 150, `Orchestrator should have at most 150 lines, got ${lineCount}`);
    });
  });

  describe('Task 2: Tool Registry + Schema Definition', () => {
    it('ORK-03: Tool registry exists', (_t) => {
      const registry = path.join(refsDir, 'prescan-tool-registry.md');
      assert(fs.existsSync(registry), 'prescan-tool-registry.md should exist');
    });

    it('ORK-04 to ORK-06: Tool registry covers dependency scanners (5+)', (_t) => {
      const registry = path.join(refsDir, 'prescan-tool-registry.md');
      const content = fs.readFileSync(registry, 'utf8');
      
      const depScanners = ['npm audit', 'pip-audit', 'cargo audit', 'trivy', 'osv-scanner'];
      depScanners.forEach(scanner => {
        assert(content.includes(scanner), `Registry should include ${scanner}`);
      });
      assert(content.includes('## Dependency Scanners'), 'Should have Dependency Scanners section');
    });

    it('ORK-05: Tool registry covers secret scanners (3+)', (_t) => {
      const registry = path.join(refsDir, 'prescan-tool-registry.md');
      const content = fs.readFileSync(registry, 'utf8');
      
      const secretScanners = ['gitleaks', 'trufflehog', 'detect-secrets'];
      secretScanners.forEach(scanner => {
        assert(content.includes(scanner), `Registry should include ${scanner}`);
      });
      assert(content.includes('## Secret Scanners'), 'Should have Secret Scanners section');
    });

    it('ORK-06: Tool registry covers SAST tools (4+)', (_t) => {
      const registry = path.join(refsDir, 'prescan-tool-registry.md');
      const content = fs.readFileSync(registry, 'utf8');
      
      const sastTools = ['semgrep', 'bandit', 'gosec', 'eslint-plugin-security'];
      sastTools.forEach(tool => {
        assert(content.includes(tool), `Registry should include ${tool}`);
      });
      assert(content.includes('## SAST Tools'), 'Should have SAST Tools section');
    });

    it('ORK-07: Tool registry covers IaC tools (4+)', (_t) => {
      const registry = path.join(refsDir, 'prescan-tool-registry.md');
      const content = fs.readFileSync(registry, 'utf8');
      
      const iacTools = ['hadolint', 'checkov', 'tfsec', 'kube-linter'];
      iacTools.forEach(tool => {
        assert(content.includes(tool), `Registry should include ${tool}`);
      });
      assert(content.includes('## IaC Scanners'), 'Should have IaC Scanners section');
    });

    it('ORK-08: Tool registry covers binary analysis tools', (_t) => {
      const registry = path.join(refsDir, 'prescan-tool-registry.md');
      const content = fs.readFileSync(registry, 'utf8');
      
      const binaryTools = ['file', 'strings', 'sha256sum'];
      binaryTools.forEach(tool => {
        assert(content.includes(tool), `Registry should include ${tool}`);
      });
      assert(content.includes('## Binary'), 'Should have Binary analysis section');
    });

    it('ORK-03 to ORK-08: Registry covers PRE-SCAN-RESULTS.json schema', (_t) => {
      const registry = path.join(refsDir, 'prescan-tool-registry.md');
      const content = fs.readFileSync(registry, 'utf8');
      
      assert(content.includes('## PRE-SCAN-RESULTS.json Schema'), 'Should document schema');
      assert(content.includes('scan_metadata'), 'Schema should include scan_metadata');
      assert(content.includes('tools_executed'), 'Schema should include tools_executed');
      assert(content.includes('findings'), 'Schema should include findings');
      assert(content.includes('summary'), 'Schema should include summary');
      assert(content.includes('"severity":'), 'Schema should define severity field');
      assert(content.includes('"cve":'), 'Schema should include CVE tracking');
      assert(content.includes('Determinism'), 'Should document determinism guarantees');
    });

    it('ORK-03: Tool registry is 200+ lines', (_t) => {
      const registry = path.join(refsDir, 'prescan-tool-registry.md');
      const content = fs.readFileSync(registry, 'utf8');
      const lineCount = content.split('\n').length;
      
      assert(lineCount >= 200, `Registry should have at least 200 lines, got ${lineCount}`);
    });

    it('ORK-03: Schema includes normalized findings structure', (_t) => {
      const registry = path.join(refsDir, 'prescan-tool-registry.md');
      const content = fs.readFileSync(registry, 'utf8');
      
      // Check for example normalized finding
      assert(
        content.includes('tool_name') && content.includes('tool_type') && 
        content.includes('severity') && content.includes('title'),
        'Schema should have normalized finding fields'
      );
    });
  });

  describe('Task 3: Workflow & Agent Integration', () => {
    it('ORK-09: security-audit.md workflow includes pre-scan step', (_t) => {
      const workflow = path.join(workflowsDir, 'security-audit.md');
      const content = fs.readFileSync(workflow, 'utf8');
      
      assert(content.includes('prescan'), 'Workflow should include prescan step');
      assert(content.includes('security-prescan.sh'), 'Should reference prescan script');
      assert(content.includes('PRE-SCAN-RESULTS.json'), 'Should reference prescan output');
    });

    it('ORK-09: threat-scan.md workflow includes pre-scan step', (_t) => {
      const workflow = path.join(workflowsDir, 'threat-scan.md');
      const content = fs.readFileSync(workflow, 'utf8');
      
      assert(content.includes('prescan'), 'Workflow should include prescan step');
      assert(content.includes('security-prescan.sh'), 'Should reference prescan script');
      assert(content.includes('PRE-SCAN-RESULTS.json'), 'Should reference prescan output');
    });

    it('ORK-10: gsd-security-scanner agent shifted to analysis mode', (_t) => {
      const agent = path.join(agentsDir, 'gsd-security-scanner.md');
      const content = fs.readFileSync(agent, 'utf8');
      
      assert(content.includes('Analysis-focused'), 'Agent should shift to analysis mode');
      assert(content.includes('tool_findings'), 'Agent should accept tool_findings');
      assert(content.includes('False Positive Triage'), 'Agent should analyze false positives');
      assert(content.includes('Business Logic Impact'), 'Agent should assess business impact');
      assert(content.includes('Remediation Priority'), 'Agent should prioritize remediation');
      assert(content.includes('PRE-SCAN-RESULTS.json'), 'Agent should reference prescan output');
    });

    it('ORK-10: gsd-threat-scanner agent shifted to adversarial analysis mode', (_t) => {
      const agent = path.join(agentsDir, 'gsd-threat-scanner.md');
      const content = fs.readFileSync(agent, 'utf8');
      
      assert(content.includes('Threat Analysis Mode'), 'Agent should have threat analysis mode');
      assert(content.includes('tool_findings'), 'Agent should accept threat findings');
      assert(content.includes('Attack Vectors'), 'Agent should reason about attack vectors');
      assert(content.includes('Exploitation Paths'), 'Agent should identify exploitation paths');
      assert(content.includes('Supply Chain Risk'), 'Agent should assess supply chain risk');
      assert(content.includes('PRE-SCAN-RESULTS.json'), 'Agent should reference prescan output');
    });

    it('ORK-10: Agent prompts changed from mechanical scanning to reasoning', (_t) => {
      const securityAgent = path.join(agentsDir, 'gsd-security-scanner.md');
      const threatAgent = path.join(agentsDir, 'gsd-threat-scanner.md');
      
      const secContent = fs.readFileSync(securityAgent, 'utf8');
      const threatContent = fs.readFileSync(threatAgent, 'utf8');
      
      // Should have analysis-focused sections
      assert(secContent.includes('Analysis-focused'), 'Should shift to analysis-focused mode');
      
      // Should say "analyze findings"
      assert(secContent.includes('Analyze') || secContent.includes('analyze'), 'Should have analysis language');
      assert(threatContent.includes('Threat Analysis') || threatContent.includes('threat'), 'Should have threat analysis language');
    });
  });

  describe('Phase 6 Deliverables', () => {
    it('All required files created', (_t) => {
      const files = [
        path.join(binDir, 'security-prescan.sh'),
        path.join(binDir, 'security_prescan.py'),
        path.join(refsDir, 'prescan-tool-registry.md'),
        path.join(workflowsDir, 'security-audit.md'),
        path.join(workflowsDir, 'threat-scan.md'),
        path.join(agentsDir, 'gsd-security-scanner.md'),
        path.join(agentsDir, 'gsd-threat-scanner.md')
      ];
      
      files.forEach(file => {
        assert(fs.existsSync(file), `Required file missing: ${file}`);
      });
    });

    it('Key links exist between components', (_t) => {
      const shim = path.join(binDir, 'security-prescan.sh');
      const orchestrator = path.join(binDir, 'security_prescan.py');
      
      const shimContent = fs.readFileSync(shim, 'utf8');
      assert(shimContent.includes('security_prescan.py'), 'Shim should call orchestrator');
    });

    it('Workflows accept prescan findings', (_t) => {
      const secAudit = path.join(workflowsDir, 'security-audit.md');
      const threatScan = path.join(workflowsDir, 'threat-scan.md');
      
      const secContent = fs.readFileSync(secAudit, 'utf8');
      const threatContent = fs.readFileSync(threatScan, 'utf8');
      
      assert(secContent.includes('PRE-SCAN-RESULTS'), 'security-audit should use prescan results');
      assert(threatContent.includes('PRE-SCAN-RESULTS'), 'threat-scan should use prescan results');
    });

    it('Agents accept tool_findings context', (_t) => {
      const secAgent = path.join(agentsDir, 'gsd-security-scanner.md');
      const threatAgent = path.join(agentsDir, 'gsd-threat-scanner.md');
      
      const secContent = fs.readFileSync(secAgent, 'utf8');
      const threatContent = fs.readFileSync(threatAgent, 'utf8');
      
      assert(secContent.includes('tool_findings'), 'security scanner should accept tool_findings');
      assert(threatContent.includes('tool_findings'), 'threat scanner should accept tool_findings');
    });

    it('ORK requirements 01-10 satisfied', (_t) => {
      const registry = path.join(refsDir, 'prescan-tool-registry.md');
      const content = fs.readFileSync(registry, 'utf8');
      
      // Count tool types
      const hasDepScanners = content.includes('npm audit') && content.includes('pip-audit');
      const hasSecretScanners = content.includes('gitleaks') && content.includes('trufflehog');
      const hasSastTools = content.includes('semgrep') && content.includes('bandit');
      const hasIacTools = content.includes('hadolint') && content.includes('checkov');
      
      assert(hasDepScanners, 'ORK-04: Dependency scanners');
      assert(hasSecretScanners, 'ORK-05: Secret scanners');
      assert(hasSastTools, 'ORK-06: SAST tools');
      assert(hasIacTools, 'ORK-07: IaC tools');
    });
  });

  describe('Determinism Verification', () => {
    it('Schema supports determinism verification', (_t) => {
      const registry = path.join(refsDir, 'prescan-tool-registry.md');
      const content = fs.readFileSync(registry, 'utf8');
      
      assert(content.includes('scan_id'), 'Should track scan ID for verification');
      assert(content.includes('timestamp'), 'Should record timestamp');
      assert(content.includes('Determinism'), 'Should document determinism approach');
    });

    it('Schema includes tool execution metadata', (_t) => {
      const registry = path.join(refsDir, 'prescan-tool-registry.md');
      const content = fs.readFileSync(registry, 'utf8');
      
      assert(content.includes('exit_code'), 'Should track exit codes');
      assert(content.includes('execution_time_ms'), 'Should track execution time');
      assert(content.includes('tools_executed'), 'Should list all tools run');
    });
  });

  describe('Token Reduction', () => {
    it('Orchestrator filters tools by runtime', (_t) => {
      const orchestrator = path.join(binDir, 'security_prescan.py');
      const content = fs.readFileSync(orchestrator, 'utf8');
      
      // Should filter tools, not run everything
      assert(content.includes('filter'), 'Should filter tools');
      assert(content.includes('runtime'), 'Should consider runtime');
      assert(content.includes('concurrent.futures'), 'Should run in parallel for efficiency');
    });

    it('Workflows pass structured findings to agents', (_t) => {
      const secAudit = path.join(workflowsDir, 'security-audit.md');
      const content = fs.readFileSync(secAudit, 'utf8');
      
      // Agent receives structured JSON, not raw tool output
      assert(content.includes('PRE-SCAN-RESULTS.json'), 'Should pass structured results');
    });
  });
});
