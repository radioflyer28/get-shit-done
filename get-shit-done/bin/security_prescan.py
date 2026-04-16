#!/usr/bin/env python3
"""
Security Pre-Scan Orchestrator
Runs applicable security tools in parallel and normalizes findings into structured JSON.
"""

import json
import os
import sys
import subprocess
import concurrent.futures
from pathlib import Path
from datetime import datetime
import uuid
import time

class PrescanOrchestrator:
    """Orchestrates parallel execution of security scanning tools."""
    
    def __init__(self, target_dir, timeout_per_tool=30):
        self.target_dir = Path(target_dir).resolve()
        self.timeout = timeout_per_tool
        self.scan_id = str(uuid.uuid4())
        self.scan_metadata = {
            "scan_id": self.scan_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "target_directory": str(self.target_dir),
            "runtime_detected": os.getenv("PRESCAN_RUNTIME", "unknown")
        }
        self.tools_executed = []
        self.findings = []
        self.execution_start = time.time()
    
    def load_tool_registry(self):
        """Load applicable tools based on runtime detection."""
        runtime = self.scan_metadata["runtime_detected"]
        
        # Tool registry: {tool_name: {type, runtime_filter, command, parser}}
        tool_registry = {
            "npm_audit": {
                "type": "dep-scanner",
                "runtime_filter": ["node", "mixed"],
                "required_files": ["package.json"],
                "command": ["npm", "audit", "--json"],
                "requires_tool": "npm"
            },
            "pip_audit": {
                "type": "dep-scanner",
                "runtime_filter": ["python", "mixed"],
                "required_files": ["requirements.txt", "setup.py", "pyproject.toml"],
                "command": ["pip-audit", "--desc", "--format", "json"],
                "requires_tool": "pip-audit"
            },
            "cargo_audit": {
                "type": "dep-scanner",
                "runtime_filter": ["rust", "mixed"],
                "required_files": ["Cargo.toml"],
                "command": ["cargo", "audit", "--json"],
                "requires_tool": "cargo"
            },
            "semgrep": {
                "type": "sast",
                "runtime_filter": ["node", "python", "go", "mixed"],
                "required_files": [],
                "command": ["semgrep", "--json", "."],
                "requires_tool": "semgrep"
            },
            "bandit": {
                "type": "sast",
                "runtime_filter": ["python", "mixed"],
                "required_files": ["*.py"],
                "command": ["bandit", "-r", ".", "-f", "json"],
                "requires_tool": "bandit"
            },
            "gitleaks": {
                "type": "secret-scanner",
                "runtime_filter": ["node", "python", "go", "rust", "mixed"],
                "required_files": [".git"],
                "command": ["gitleaks", "detect", "--report-path", "/tmp/gitleaks.json", "--verbose"],
                "requires_tool": "gitleaks"
            },
            "trufflehog": {
                "type": "secret-scanner",
                "runtime_filter": ["node", "python", "go", "rust", "mixed"],
                "required_files": [".git"],
                "command": ["trufflehog", "filesystem", ".", "--json"],
                "requires_tool": "trufflehog"
            },
            "hadolint": {
                "type": "iac",
                "runtime_filter": ["mixed"],
                "required_files": ["Dockerfile"],
                "command": ["hadolint", "--format", "json", "Dockerfile"],
                "requires_tool": "hadolint"
            },
            "checkov": {
                "type": "iac",
                "runtime_filter": ["mixed"],
                "required_files": ["*.tf", "*.yaml", "*.yml"],
                "command": ["checkov", "-d", ".", "--framework", "all", "--output", "json"],
                "requires_tool": "checkov"
            }
        }
        
        # Filter tools by runtime
        applicable_tools = {}
        for tool_name, config in tool_registry.items():
            if runtime in config["runtime_filter"]:
                applicable_tools[tool_name] = config
        
        return applicable_tools
    
    def tool_available(self, tool_command):
        """Check if a tool is available in the system PATH."""
        try:
            subprocess.run(
                ["which", tool_command[0]],
                capture_output=True,
                timeout=5,
                check=False
            )
            return True
        except Exception:
            return False
    
    def run_tool(self, tool_name, config):
        """Execute a single tool and capture output."""
        start_time = time.time()
        try:
            # Verify tool is available
            if not self.tool_available(config["command"]):
                return {
                    "tool_name": tool_name,
                    "tool_type": config["type"],
                    "exit_code": -1,
                    "execution_time_ms": 0,
                    "errors": [f"Tool {config['command'][0]} not found in PATH"],
                    "findings_count": 0
                }
            
            # Run tool
            result = subprocess.run(
                config["command"],
                cwd=self.target_dir,
                capture_output=True,
                timeout=self.timeout,
                text=True
            )
            
            execution_time = int((time.time() - start_time) * 1000)
            
            # Parse output and extract findings count
            findings_count = 0
            try:
                if result.stdout:
                    output = json.loads(result.stdout)
                    findings_count = len(output) if isinstance(output, list) else 1
            except json.JSONDecodeError:
                pass
            
            return {
                "tool_name": tool_name,
                "tool_type": config["type"],
                "exit_code": result.returncode,
                "execution_time_ms": execution_time,
                "errors": [result.stderr] if result.stderr else [],
                "findings_count": findings_count,
                "stdout": result.stdout if result.returncode == 0 else None
            }
        
        except subprocess.TimeoutExpired:
            return {
                "tool_name": tool_name,
                "tool_type": config["type"],
                "exit_code": -1,
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "errors": [f"Tool execution timeout after {self.timeout}s"],
                "findings_count": 0
            }
        except Exception as e:
            return {
                "tool_name": tool_name,
                "tool_type": config["type"],
                "exit_code": -1,
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "errors": [str(e)],
                "findings_count": 0
            }
    
    def run_tools_parallel(self, tools):
        """Execute tools in parallel using ProcessPoolExecutor."""
        max_workers = min(os.cpu_count() or 4, len(tools))
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(self.run_tool, name, config): name
                for name, config in tools.items()
            }
            
            for future in concurrent.futures.as_completed(futures):
                try:
                    result = future.result()
                    self.tools_executed.append(result)
                except Exception as e:
                    self.tools_executed.append({
                        "tool_name": futures[future],
                        "error": str(e)
                    })
    
    def normalize_findings(self):
        """Normalize tool outputs into unified findings schema."""
        # For now, aggregate execution metadata
        # Actual finding parsing would happen here based on tool output format
        
        for tool_exec in self.tools_executed:
            if tool_exec.get("exit_code") == 0 and tool_exec.get("stdout"):
                # Parse tool-specific output and convert to unified schema
                try:
                    output = json.loads(tool_exec["stdout"])
                    tool_name = tool_exec["tool_name"]
                    
                    # Simplified: create findings entries (real implementation would parse each tool format)
                    if isinstance(output, dict) and "vulnerabilities" in output:
                        # npm audit format
                        for vuln in output.get("vulnerabilities", {}).values():
                            self.findings.append({
                                "tool": tool_name,
                                "type": "vulnerability",
                                "severity": vuln.get("severity", "unknown"),
                                "title": vuln.get("title", ""),
                                "affected_package": vuln.get("name", ""),
                                "cve": vuln.get("cve", ""),
                                "category": "dependency"
                            })
                except (json.JSONDecodeError, KeyError, TypeError):
                    pass
    
    def write_results(self):
        """Write normalized findings to PRE-SCAN-RESULTS.json."""
        self.normalize_findings()
        
        total_time = int((time.time() - self.execution_start) * 1000)
        
        results = {
            "scan_metadata": self.scan_metadata,
            "tools_executed": self.tools_executed,
            "findings": self.findings,
            "summary": {
                "total_findings": len(self.findings),
                "by_severity": self._count_by_severity(),
                "by_tool": self._count_by_tool(),
                "execution_time_total_ms": total_time,
                "tools_skipped": [],
                "tools_failed": [
                    t["tool_name"] for t in self.tools_executed
                    if t.get("exit_code", 0) != 0
                ]
            }
        }
        
        output_path = Path(self.target_dir) / "PRE-SCAN-RESULTS.json"
        with open(output_path, "w") as f:
            json.dump(results, f, indent=2)
        
        print(f"PRE-SCAN-RESULTS.json written to {output_path}")
        return results
    
    def _count_by_severity(self):
        """Count findings by severity."""
        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for finding in self.findings:
            severity = finding.get("severity", "low")
            if severity in counts:
                counts[severity] += 1
        return counts
    
    def _count_by_tool(self):
        """Count findings by tool."""
        counts = {}
        for finding in self.findings:
            tool = finding.get("tool", "unknown")
            counts[tool] = counts.get(tool, 0) + 1
        return counts
    
    def run(self):
        """Execute the full prescan orchestration."""
        try:
            tools = self.load_tool_registry()
            if not tools:
                print(f"No applicable tools found for runtime: {self.scan_metadata['runtime_detected']}")
                return 2
            
            print(f"Running pre-scan on {self.target_dir} (runtime: {self.scan_metadata['runtime_detected']})")
            print(f"Found {len(tools)} applicable tools: {', '.join(tools.keys())}")
            
            self.run_tools_parallel(tools)
            self.write_results()
            
            return 0
        except Exception as e:
            print(f"ERROR: Pre-scan orchestration failed: {e}", file=sys.stderr)
            return 1

def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    
    if not Path(target_dir).is_dir():
        print(f"ERROR: Target directory does not exist: {target_dir}", file=sys.stderr)
        sys.exit(1)
    
    orchestrator = PrescanOrchestrator(target_dir)
    exit_code = orchestrator.run()
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
