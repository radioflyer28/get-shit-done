#!/usr/bin/env python3
"""
supply_chain_intel.py — Supply chain intelligence for GSD security scanner

Queries OSV, deps.dev, and GitHub Advisory APIs in parallel for packages
found in the project's lockfiles. Writes SUPPLY-CHAIN-INTEL.json.

Usage:
  python3 supply_chain_intel.py <target_dir>
  python3 supply_chain_intel.py <target_dir> --output /path/to/output.json
  python3 supply_chain_intel.py <target_dir> --dry-run   (list packages only)

APIs (all hardcoded, no user-controlled URL construction):
  OSV:              https://api.osv.dev/v1/query   (no auth)
  deps.dev:         https://api.deps.dev/v3alpha/systems/{ecosystem}/packages/{name}  (no auth)
  GitHub Advisory:  https://api.github.com/graphql  (requires GITHUB_TOKEN env var)
"""

import argparse
import concurrent.futures
import datetime
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request

# ── Hardcoded API constants (never user-controlled) ──────────────────────────
OSV_API_URL = "https://api.osv.dev/v1/query"
DEPS_DEV_BASE_URL = "https://api.deps.dev/v3alpha/systems"
GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"
API_TIMEOUT = 5  # seconds
MAX_PACKAGES = 50

# Ecosystem mapping from lockfile filename
LOCKFILE_ECOSYSTEMS = {
    "package-lock.json": "npm",
    "yarn.lock": "npm",
    "pnpm-lock.yaml": "npm",
    "requirements.txt": "PyPI",
    "Pipfile.lock": "PyPI",
    "poetry.lock": "PyPI",
    "Cargo.lock": "crates.io",
    "go.sum": "Go",
    "Gemfile.lock": "RubyGems",
}


# ── Lockfile parsers ──────────────────────────────────────────────────────────

def _parse_package_lock(path):
    """Parse package-lock.json — return list of {name, version, ecosystem}."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return []
    deps = data.get("dependencies", {}) or data.get("packages", {})
    results = []
    for name, info in deps.items():
        if isinstance(info, dict):
            version = info.get("version", "")
            if version and not name.startswith("node_modules/"):
                results.append({"name": name, "version": version, "ecosystem": "npm"})
    return results[:MAX_PACKAGES]


def _parse_requirements_txt(path):
    """Parse requirements.txt — return list of {name, version, ecosystem}."""
    results = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or line.startswith("-"):
                    continue
                # Handle name==version, name>=version etc.
                m = re.match(r"^([A-Za-z0-9_\-\.]+)\s*[=<>!~]+\s*([A-Za-z0-9_\-\.]+)", line)
                if m:
                    results.append({"name": m.group(1), "version": m.group(2), "ecosystem": "PyPI"})
                else:
                    # Package name only, no version pinned
                    m2 = re.match(r"^([A-Za-z0-9_\-\.]+)\s*$", line)
                    if m2:
                        results.append({"name": m2.group(1), "version": "", "ecosystem": "PyPI"})
    except Exception:
        pass
    return results[:MAX_PACKAGES]


def _parse_cargo_lock(path):
    """Parse Cargo.lock — return list of {name, version, ecosystem}."""
    results = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        # Find [[package]] blocks
        blocks = re.split(r"\[\[package\]\]", content)
        for block in blocks[1:]:
            name_m = re.search(r'name\s*=\s*"([^"]+)"', block)
            ver_m = re.search(r'version\s*=\s*"([^"]+)"', block)
            if name_m and ver_m:
                results.append({
                    "name": name_m.group(1),
                    "version": ver_m.group(1),
                    "ecosystem": "crates.io",
                })
    except Exception:
        pass
    return results[:MAX_PACKAGES]


def _parse_go_sum(path):
    """Parse go.sum — return list of {name, version, ecosystem}."""
    results = []
    seen = set()
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split()
                if not parts:
                    continue
                # Format: module@version hash  (skip /go.mod lines)
                mv = parts[0]
                if mv.endswith("/go.mod"):
                    continue
                if "@" in mv:
                    name, version = mv.rsplit("@", 1)
                    key = f"{name}@{version}"
                    if key not in seen:
                        seen.add(key)
                        results.append({"name": name, "version": version, "ecosystem": "Go"})
    except Exception:
        pass
    return results[:MAX_PACKAGES]


def _parse_gemfile_lock(path):
    """Parse Gemfile.lock — return list of {name, version, ecosystem}."""
    results = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            in_deps = False
            for line in f:
                stripped = line.strip()
                if stripped == "DEPENDENCIES":
                    in_deps = True
                    continue
                if in_deps:
                    if stripped == "" or (not line.startswith(" ") and not line.startswith("\t")):
                        in_deps = False
                        continue
                    m = re.match(r"^\s+([A-Za-z0-9_\-\.]+)\s*\(([^)]+)\)", stripped)
                    if m:
                        results.append({
                            "name": m.group(1),
                            "version": m.group(2).lstrip("~>= "),
                            "ecosystem": "RubyGems",
                        })
    except Exception:
        pass
    return results[:MAX_PACKAGES]


def parse_lockfiles(target_dir):
    """Scan target_dir for known lockfiles and extract up to MAX_PACKAGES packages."""
    all_packages = []
    seen_names = set()

    parsers = {
        "package-lock.json": _parse_package_lock,
        "requirements.txt": _parse_requirements_txt,
        "Cargo.lock": _parse_cargo_lock,
        "go.sum": _parse_go_sum,
        "Gemfile.lock": _parse_gemfile_lock,
    }

    for lockfile, parser in parsers.items():
        path = os.path.join(target_dir, lockfile)
        if os.path.exists(path):
            pkgs = parser(path)
            for pkg in pkgs:
                key = f"{pkg['ecosystem']}:{pkg['name']}"
                if key not in seen_names:
                    seen_names.add(key)
                    all_packages.append(pkg)
                if len(all_packages) >= MAX_PACKAGES:
                    break
        if len(all_packages) >= MAX_PACKAGES:
            break

    return all_packages[:MAX_PACKAGES]


# ── API query functions ───────────────────────────────────────────────────────

def query_osv(pkg):
    """Query OSV API for known CVEs. Returns {vulns_count, vulns[], error}."""
    # Hardcoded URL — no user input in URL construction
    body = {"package": {"name": pkg["name"], "ecosystem": pkg["ecosystem"]}}
    if pkg.get("version"):
        body["version"] = pkg["version"]

    try:
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            OSV_API_URL,
            data=data,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=API_TIMEOUT) as resp:
            result = json.loads(resp.read().decode("utf-8"))
        vulns = result.get("vulns", [])
        return {
            "vulns_count": len(vulns),
            "vulns": [{"id": v.get("id", ""), "summary": v.get("summary", "")} for v in vulns[:5]],
            "error": None,
        }
    except urllib.error.URLError as e:
        return {"vulns_count": 0, "vulns": [], "error": f"URLError: {e.reason}"}
    except Exception as e:
        return {"vulns_count": 0, "vulns": [], "error": str(e)}


def query_deps_dev(pkg):
    """Query deps.dev for package metadata. Returns {latest_version, license, error}."""
    # Hardcoded base URL — ecosystem and name are URL-encoded
    ecosystem = urllib.parse.quote(pkg["ecosystem"], safe="")
    name = urllib.parse.quote(pkg["name"], safe="")
    url = f"{DEPS_DEV_BASE_URL}/{ecosystem}/packages/{name}"

    try:
        req = urllib.request.Request(
            url,
            headers={"Accept": "application/json"},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=API_TIMEOUT) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        # Find default version
        versions = result.get("package", {}).get("versions", []) or result.get("versions", [])
        latest_version = ""
        license_id = ""
        for v in versions:
            vk = v.get("versionKey", {})
            if v.get("isDefault") or v.get("isLatestStable"):
                latest_version = vk.get("version", "")
                license_id = v.get("licenses", [""])[0] if v.get("licenses") else ""
                break

        return {"latest_version": latest_version, "license": license_id, "error": None}
    except urllib.error.URLError as e:
        return {"latest_version": "", "license": "", "error": f"URLError: {e.reason}"}
    except Exception as e:
        return {"latest_version": "", "license": "", "error": str(e)}


def query_github_advisory(pkg):
    """Query GitHub Advisory DB via GraphQL. Requires GITHUB_TOKEN env var."""
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        return {"advisories_count": 0, "advisories": [], "error": "GITHUB_TOKEN not set"}

    # Map ecosystem to GitHub Advisory ecosystem enum
    ecosystem_map = {
        "npm": "NPM",
        "PyPI": "PIP",
        "crates.io": "RUST",
        "Go": "GO",
        "RubyGems": "RUBYGEMS",
    }
    gh_ecosystem = ecosystem_map.get(pkg["ecosystem"], "")
    if not gh_ecosystem:
        return {"advisories_count": 0, "advisories": [], "error": f"Unsupported ecosystem: {pkg['ecosystem']}"}

    query = """
query($pkg: String!, $eco: SecurityAdvisoryEcosystem!) {
  securityVulnerabilities(first: 5, package: $pkg, ecosystem: $eco) {
    nodes {
      advisory { summary severity publishedAt }
      vulnerableVersionRange
    }
  }
}
"""
    body = json.dumps({"query": query, "variables": {"pkg": pkg["name"], "eco": gh_ecosystem}}).encode("utf-8")

    try:
        req = urllib.request.Request(
            GITHUB_GRAPHQL_URL,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"bearer {token}",
                "Accept": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=API_TIMEOUT) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        nodes = result.get("data", {}).get("securityVulnerabilities", {}).get("nodes", []) or []
        advisories = [
            {
                "summary": n.get("advisory", {}).get("summary", ""),
                "severity": n.get("advisory", {}).get("severity", ""),
                "published_at": n.get("advisory", {}).get("publishedAt", ""),
                "vulnerable_range": n.get("vulnerableVersionRange", ""),
            }
            for n in nodes
        ]
        return {"advisories_count": len(advisories), "advisories": advisories, "error": None}
    except urllib.error.URLError as e:
        return {"advisories_count": 0, "advisories": [], "error": f"URLError: {e.reason}"}
    except Exception as e:
        return {"advisories_count": 0, "advisories": [], "error": str(e)}


def query_package(pkg):
    """Query all three APIs for a single package. Used as ThreadPoolExecutor worker."""
    return {
        "name": pkg["name"],
        "version": pkg.get("version", ""),
        "ecosystem": pkg["ecosystem"],
        "osv": query_osv(pkg),
        "deps_dev": query_deps_dev(pkg),
        "github_advisory": query_github_advisory(pkg),
    }


# ── Main ──────────────────────────────────────────────────────────────────────

# urllib.parse needed for query_deps_dev URL encoding
import urllib.parse


def main():
    parser = argparse.ArgumentParser(
        description="GSD supply chain intelligence — queries OSV, deps.dev, and GitHub Advisory"
    )
    parser.add_argument("target_dir", help="Target repository directory")
    parser.add_argument(
        "--output",
        default=None,
        help="Output file path (default: <target_dir>/SUPPLY-CHAIN-INTEL.json)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List packages found without querying APIs",
    )
    args = parser.parse_args()

    target_dir = os.path.abspath(args.target_dir)
    if not os.path.isdir(target_dir):
        print(f"Error: {target_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    output_path = args.output or os.path.join(target_dir, "SUPPLY-CHAIN-INTEL.json")

    print(f"Scanning lockfiles in: {target_dir}", file=sys.stderr)
    packages = parse_lockfiles(target_dir)

    if not packages:
        print("No lockfiles found or no packages extracted.", file=sys.stderr)
        result = {
            "scan_id": "no-git-0",
            "timestamp": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "packages_queried": 0,
            "results": [],
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
            f.write("\n")
        print(f"Output: {output_path}", file=sys.stderr)
        return

    print(f"Found {len(packages)} packages to query", file=sys.stderr)

    if args.dry_run:
        for pkg in packages:
            print(f"  {pkg['ecosystem']:12} {pkg['name']}@{pkg.get('version', '?')}")
        return

    # Parallel API queries
    print("Querying APIs in parallel...", file=sys.stderr)
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(query_package, pkg): pkg for pkg in packages}
        for future in concurrent.futures.as_completed(futures):
            try:
                results.append(future.result())
            except Exception as e:
                pkg = futures[future]
                results.append({
                    "name": pkg["name"],
                    "version": pkg.get("version", ""),
                    "ecosystem": pkg["ecosystem"],
                    "osv": {"vulns_count": 0, "vulns": [], "error": str(e)},
                    "deps_dev": {"latest_version": "", "license": "", "error": str(e)},
                    "github_advisory": {"advisories_count": 0, "advisories": [], "error": str(e)},
                })

    # Sort results by name for deterministic output
    results.sort(key=lambda r: r["name"].lower())

    # Build scan_id
    import subprocess
    import time
    try:
        git_short = subprocess.check_output(
            ["git", "-C", target_dir, "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL, timeout=5,
        ).decode().strip()
    except Exception:
        git_short = "no-git"
    scan_id = f"{git_short}-{int(time.time())}"

    output = {
        "scan_id": scan_id,
        "timestamp": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "packages_queried": len(results),
        "results": results,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
        f.write("\n")

    total_vulns = sum(r["osv"]["vulns_count"] for r in results)
    print(f"Done: {len(results)} packages queried, {total_vulns} OSV vulnerabilities found", file=sys.stderr)
    print(f"Output: {output_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
