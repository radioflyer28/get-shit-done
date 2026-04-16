#!/usr/bin/env python3
"""Security Pre-Scan Orchestrator - deterministic tool execution + JSON normalization."""
import json, os, sys, subprocess, concurrent.futures, time
from pathlib import Path
from datetime import datetime
import uuid

class PrescanOrchestrator:
    """Parallel security tool orchestrator."""
    TOOL_REGISTRY = {
        "npm_audit": {"type": "dep-scanner", "runtimes": ["node", "mixed"], "cmd": ["npm", "audit", "--json"]},
        "pip_audit": {"type": "dep-scanner", "runtimes": ["python", "mixed"], "cmd": ["pip-audit", "--desc", "--format", "json"]},
        "cargo_audit": {"type": "dep-scanner", "runtimes": ["rust", "mixed"], "cmd": ["cargo", "audit", "--json"]},
        "semgrep": {"type": "sast", "runtimes": ["node", "python", "go", "mixed"], "cmd": ["semgrep", "--json", "."]},
        "bandit": {"type": "sast", "runtimes": ["python", "mixed"], "cmd": ["bandit", "-r", ".", "-f", "json"]},
        "gitleaks": {"type": "secret-scanner", "runtimes": ["node", "python", "go", "rust", "mixed"], "cmd": ["gitleaks", "detect", "--report-path", "/tmp/gitleaks.json"]},
        "hadolint": {"type": "iac", "runtimes": ["mixed"], "cmd": ["hadolint", "--format", "json", "Dockerfile"]},
        "checkov": {"type": "iac", "runtimes": ["mixed"], "cmd": ["checkov", "-d", ".", "--framework", "all", "--output", "json"]},
        "threat_semgrep": {
            "type": "threat-scanner",
            "runtimes": ["node", "python", "go", "rust", "mixed"],
            "cmd": ["semgrep", "--json", "--config", "get-shit-done/semgrep/threat-patterns.yml", "."],
            "output_key": "threat_semgrep",
            "category_field": "metadata.category",
            "timeout": 120,
        }
    }
    
    def __init__(self, target_dir):
        self.target_dir = Path(target_dir).resolve()
        self.runtime = os.getenv("PRESCAN_RUNTIME", "unknown")
        self.scan_id = str(uuid.uuid4())
        self.start_time = time.time()
        self.tools_executed = []
        self.findings = []
    
    def filter_applicable_tools(self):
        """Filter tools by detected runtime."""
        return {k: v for k, v in self.TOOL_REGISTRY.items() if self.runtime in v["runtimes"]}
    
    def run_tool(self, name, config):
        """Execute single tool with timeout handling."""
        start = time.time()
        timeout = config.get("timeout", 30)
        try:
            # Validate threat-patterns.yml exists before running threat_semgrep
            if name == "threat_semgrep":
                rule_file = Path(__file__).parent.parent / "semgrep" / "threat-patterns.yml"
                if not rule_file.exists():
                    return {
                        "tool_name": name, "tool_type": config["type"], "exit_code": -1,
                        "execution_time_ms": 0,
                        "errors": [f"threat-patterns.yml not found at {rule_file}"],
                        "status": "skipped", "reason": "threat-patterns.yml not found"
                    }
            result = subprocess.run(config["cmd"], cwd=self.target_dir, capture_output=True, timeout=timeout, text=True)
            tool_result = {
                "tool_name": name, "tool_type": config["type"], "exit_code": result.returncode,
                "execution_time_ms": int((time.time() - start) * 1000), "errors": [] if result.returncode == 0 else [result.stderr],
                "stdout": result.stdout if result.returncode == 0 else None
            }
            # Extract category metadata for threat_semgrep findings
            if name == "threat_semgrep" and result.stdout:
                try:
                    parsed = json.loads(result.stdout)
                    for finding in parsed.get("results", []):
                        category = finding.get("extra", {}).get("metadata", {}).get("category")
                        if category:
                            finding["category"] = category
                    tool_result["parsed_findings"] = parsed.get("results", [])
                except (json.JSONDecodeError, AttributeError):
                    pass
            return tool_result
        except subprocess.TimeoutExpired:
            return {"tool_name": name, "tool_type": config["type"], "exit_code": -1, "execution_time_ms": int((time.time() - start) * 1000), "errors": ["Timeout"]}
        except FileNotFoundError:
            # Tool not installed — produce skipped entry
            return {
                "tool_name": name, "tool_type": config["type"], "exit_code": -1,
                "execution_time_ms": int((time.time() - start) * 1000),
                "errors": [f"{config['cmd'][0]} not found"],
                "status": "skipped", "reason": f"{config['cmd'][0]} not installed"
            }
        except Exception as e:
            return {"tool_name": name, "tool_type": config["type"], "exit_code": -1, "execution_time_ms": int((time.time() - start) * 1000), "errors": [str(e)]}
    
    def run_parallel(self, tools):
        """Execute tools in parallel."""
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(os.cpu_count() or 4, len(tools))) as executor:
            futures = {executor.submit(self.run_tool, name, cfg): name for name, cfg in tools.items()}
            for future in concurrent.futures.as_completed(futures):
                try:
                    self.tools_executed.append(future.result())
                except Exception as e:
                    self.tools_executed.append({"tool_name": futures[future], "error": str(e)})
    
    def write_results(self):
        """Emit PRE-SCAN-RESULTS.json."""
        output = {
            "scan_metadata": {
                "scan_id": self.scan_id, "timestamp": datetime.utcnow().isoformat() + "Z",
                "target_directory": str(self.target_dir), "runtime_detected": self.runtime
            },
            "tools_executed": self.tools_executed,
            "findings": self.findings,
            "summary": {
                "total_findings": len(self.findings), "execution_time_total_ms": int((time.time() - self.start_time) * 1000),
                "tools_executed_successfully": [t["tool_name"] for t in self.tools_executed if t.get("exit_code") == 0],
                "tools_failed": [t["tool_name"] for t in self.tools_executed if t.get("exit_code", 0) != 0]
            }
        }
        path = self.target_dir / "PRE-SCAN-RESULTS.json"
        with open(path, "w") as f:
            json.dump(output, f, indent=2)
        print(f"PRE-SCAN-RESULTS.json: {path}")
    
    def run(self):
        """Orchestrate prescan."""
        tools = self.filter_applicable_tools()
        if not tools:
            print(f"No tools for runtime: {self.runtime}")
            return 2
        print(f"Pre-scan: {len(tools)} tools ({self.runtime})")
        self.run_parallel(tools)
        self.write_results()
        return 0

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    if not Path(target).is_dir():
        print(f"ERROR: {target} not found", file=sys.stderr)
        sys.exit(1)
    sys.exit(PrescanOrchestrator(Path(target)).run())

if __name__ == "__main__":
    main()
