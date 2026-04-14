<purpose>
Scan an untrusted or third-party codebase for deliberate threats: backdoors, trojans, data
exfiltration, supply chain attacks, and OSINT harvesting. Spawns gsd-threat-scanner agent.
Produces THREAT-SCAN.md. Static analysis only — never executes target code.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<available_agent_types>
- gsd-threat-scanner: Scans untrusted codebases for deliberate malicious code
</available_agent_types>

<process>

<step name="initialize">
Parse arguments:

```bash
TARGET_PATH="."
DEPTH="standard"
FOCUS="all"
QUARANTINE="false"

# First positional arg is target path (if not a flag)
for arg in $ARGUMENTS; do
  case "$arg" in
    --depth=*) DEPTH="${arg#--depth=}" ;;
    --focus=*) FOCUS="${arg#--focus=}" ;;
    --quarantine) QUARANTINE="true" ;;
    --*) ;; # unknown flag, ignore
    *) TARGET_PATH="$arg" ;; # positional = target path
  esac
done
```

**Validate target path:**
```bash
if [ ! -d "$TARGET_PATH" ]; then
  echo "Error: Target path '${TARGET_PATH}' does not exist or is not a directory."
  # Exit workflow
fi

# Security: resolve to absolute path, prevent traversal
ABS_TARGET=$(realpath "$TARGET_PATH" 2>/dev/null || echo "$TARGET_PATH")
```

**Validate depth:**
```bash
case "$DEPTH" in
  quick|standard|deep) ;; # valid
  *) echo "Warning: Invalid depth '${DEPTH}'. Using 'standard'."; DEPTH="standard" ;;
esac
```

**Validate focus:**
```bash
case "$FOCUS" in
  backdoors|exfil|supply-chain|osint|all) ;; # valid
  *) echo "Warning: Invalid focus '${FOCUS}'. Using 'all'."; FOCUS="all" ;;
esac
```

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  GSD > THREAT SCAN (UNTRUSTED CODE)
  Target: {target_path}
  Depth: {depth} | Focus: {focus}
  ⚠️  Static analysis only — no code will be executed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
</step>

<step name="safety_check">
**CRITICAL: Verify we won't execute untrusted code.**

Before proceeding, confirm:
1. No `npm install`, `pip install`, `go build`, `cargo build`, `make`, or equivalent will be run
2. No test suites from the target will be executed
3. No shell scripts from the target will be sourced or run
4. Analysis uses read-only commands only: `find`, `grep`, `cat`, `wc`, `file`, `stat`, `git log`, `git diff`, `git branch`

If the target is the current working directory AND has a `.planning/` directory, warn:
```
⚠️  Target appears to be the current project (has .planning/).
    For your own code, use /gsd-security-audit instead.
    Continue with threat scan? [y/N]
```
</step>

<step name="recon">
Quick reconnaissance to understand the target:

```bash
# File count and types
echo "File inventory:"
find "$TARGET_PATH" -type f -not -path '*/.git/*' -not -path '*/node_modules/*' | wc -l
find "$TARGET_PATH" -type f -not -path '*/.git/*' -not -path '*/node_modules/*' | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -15

# Project identity
for f in README.md README.rst README package.json setup.py Cargo.toml go.mod; do
  [ -f "$TARGET_PATH/$f" ] && echo "Found: $f"
done

# Binary files (potential payloads)
BINARY_COUNT=$(find "$TARGET_PATH" -type f \( -name "*.so" -o -name "*.dll" -o -name "*.exe" -o -name "*.bin" -o -name "*.dat" -o -name "*.dylib" \) -not -path '*/.git/*' 2>/dev/null | wc -l)
echo "Binary files: $BINARY_COUNT"

# Hidden files
HIDDEN_COUNT=$(find "$TARGET_PATH" -name ".*" -not -name ".git" -not -name ".gitignore" -not -name ".gitattributes" -not -name ".editorconfig" -not -name ".env*" -type f 2>/dev/null | wc -l)
echo "Hidden files (non-standard): $HIDDEN_COUNT"
```
</step>

<step name="compute_scope">
Build the list of files for the scanner:

```bash
FILES_TO_SCAN=""

# Package manifests (always include — supply chain analysis)
for f in package.json package-lock.json yarn.lock requirements.txt Pipfile Pipfile.lock \
         setup.py setup.cfg pyproject.toml go.mod go.sum Cargo.toml Cargo.lock Gemfile Gemfile.lock; do
  [ -f "$TARGET_PATH/$f" ] && FILES_TO_SCAN+="  - ${TARGET_PATH}/${f}\n"
done

# Install/build scripts (always include — hook analysis)
for f in $(find "$TARGET_PATH" -maxdepth 2 \( -name "Makefile" -o -name "Dockerfile*" -o -name "*.sh" -o -name "*.bat" -o -name "*.ps1" -o -name "*.cmd" -o -name "build.rs" \) -not -path '*/.git/*' 2>/dev/null | head -20); do
  FILES_TO_SCAN+="  - ${f}\n"
done

# Source files (no hard cap — parallel dispatch handles large repos)
SOURCE_FILES=$(find "$TARGET_PATH" -type f \
  \( -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \
     -o -name "*.go" -o -name "*.rs" -o -name "*.rb" -o -name "*.java" -o -name "*.kt" \
     -o -name "*.c" -o -name "*.cpp" -o -name "*.h" -o -name "*.hpp" -o -name "*.cs" \
     -o -name "*.php" -o -name "*.swift" -o -name "*.dart" -o -name "*.pl" -o -name "*.pm" \
     -o -name "*.lua" -o -name "*.html" -o -name "*.htm" -o -name "*.css" \
     -o -name "*.sh" -o -name "*.bash" -o -name "*.zsh" \
     -o -name "*.ps1" -o -name "*.psm1" -o -name "*.psd1" \
     -o -name "*.tf" -o -name "*.tfvars" \
     -o -name "*.graphql" -o -name "*.gql" \
     -o -name "*.yaml" -o -name "*.yml" \) \
  -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/vendor/*' \
  -not -path '*/__pycache__/*' -not -path '*/dist/*' -not -path '*/build/*')
TOTAL_SOURCE_COUNT=$(echo "$SOURCE_FILES" | wc -l)

for f in $SOURCE_FILES; do
  FILES_TO_SCAN+="  - ${f}\n"
done

# Binary files (for IOC extraction, not execution)
BINARY_FILES=$(find "$TARGET_PATH" -type f \
  \( -name "*.so" -o -name "*.dll" -o -name "*.exe" -o -name "*.bin" -o -name "*.dat" \
     -o -name "*.wasm" -o -name "*.dylib" -o -name "*.class" -o -name "*.jar" \
     -o -name "*.pkl" -o -name "*.pickle" \) \
  -not -path '*/.git/*' 2>/dev/null)
for f in $BINARY_FILES; do
  FILES_TO_SCAN+="  - ${f}\n"
done
```

If no source files found:
```
No source files found in target. Nothing to scan.
```
Exit workflow.
</step>

<step name="load_mapper_intel">
**Optional accelerator — skip if .planning/codebase/ does not exist.**

If a previous `/gsd-map-codebase` run produced codebase documents, load them as supplementary context.
The mapper only reads files (same as the threat scanner itself), so this is safe even for untrusted code.

```bash
MAPPER_CONTEXT=""

if [ -f ".planning/codebase/STACK.md" ]; then
  MAPPER_CONTEXT+="<mapper_intel>\n"
  MAPPER_CONTEXT+="The following codebase analysis is available from a previous /gsd-map-codebase run.\n"
  MAPPER_CONTEXT+="Use it to: identify tech stack, locate entry points and integration boundaries,\n"
  MAPPER_CONTEXT+="narrow focus to high-risk areas, and avoid re-discovering project structure.\n\n"

  for doc in STACK.md ARCHITECTURE.md INTEGRATIONS.md CONCERNS.md; do
    if [ -f ".planning/codebase/${doc}" ]; then
      MAPPER_CONTEXT+="--- ${doc} ---\n"
      MAPPER_CONTEXT+="$(cat .planning/codebase/${doc})\n\n"
    fi
  done

  MAPPER_CONTEXT+="</mapper_intel>\n"
  echo "Loaded mapper intel: $(ls .planning/codebase/{STACK,ARCHITECTURE,INTEGRATIONS,CONCERNS}.md 2>/dev/null | wc -l) documents"
else
  echo "No mapper intel found. Running standalone."
fi
```
</step>

<step name="resolve_language_references">
Determine which language and framework reference files to include based on detected languages
in the TARGET codebase. These provide language-specific threat patterns.

```bash
LANG_REFS=""
REFS_DIR=".github/get-shit-done/references/languages"

# Detect languages in target path
DETECTED_LANGS=""
[ -n "$(find "$TARGET_PATH" -name '*.py' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="python "
[ -n "$(find "$TARGET_PATH" \( -name '*.js' -o -name '*.ts' -o -name '*.jsx' -o -name '*.tsx' \) -not -path '*/node_modules/*' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="javascript "
[ -n "$(find "$TARGET_PATH" -name '*.go' -not -path '*/vendor/*' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="go "
[ -n "$(find "$TARGET_PATH" -name '*.rs' -not -path '*/target/*' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="rust "
[ -n "$(find "$TARGET_PATH" \( -name '*.java' -o -name '*.kt' \) -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="java "
[ -n "$(find "$TARGET_PATH" -name '*.kt' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="kotlin "
[ -n "$(find "$TARGET_PATH" -name '*.rb' -not -path '*/vendor/*' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="ruby "
[ -n "$(find "$TARGET_PATH" -name '*.php' -not -path '*/vendor/*' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="php "
[ -n "$(find "$TARGET_PATH" -name '*.cs' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="csharp "
[ -n "$(find "$TARGET_PATH" -name '*.swift' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="swift "
[ -n "$(find "$TARGET_PATH" \( -name '*.c' -o -name '*.cpp' -o -name '*.h' -o -name '*.hpp' \) -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="c "
[ -n "$(find "$TARGET_PATH" -name '*.dart' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="dart "
[ -n "$(find "$TARGET_PATH" \( -name '*.pl' -o -name '*.pm' \) -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="perl "
[ -n "$(find "$TARGET_PATH" -name '*.lua' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="lua "
[ -n "$(find "$TARGET_PATH" \( -name '*.sh' -o -name '*.bash' -o -name '*.zsh' \) -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="shell "
[ -n "$(find "$TARGET_PATH" \( -name '*.ps1' -o -name '*.psm1' -o -name '*.psd1' \) -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="powershell "

# Map to reference files
declare -A LANG_MAP=(
  [python]="python.md" [javascript]="javascript-typescript.md" [go]="go.md"
  [rust]="rust.md" [java]="java.md" [ruby]="ruby.md" [php]="php.md"
  [csharp]="csharp.md" [swift]="swift.md" [kotlin]="kotlin.md"
  [c]="c-cpp.md" [dart]="dart-flutter.md" [perl]="perl.md" [lua]="lua.md"
  [shell]="shell-bash.md" [powershell]="powershell.md"
)

for lang in $DETECTED_LANGS; do
  REF="${LANG_MAP[$lang]}"
  [ -n "$REF" ] && [ -f "${REFS_DIR}/${REF}" ] && LANG_REFS+="  - ${REFS_DIR}/${REF}\n"
done

[ -f "${REFS_DIR}/html-css.md" ] && LANG_REFS+="  - ${REFS_DIR}/html-css.md\n"
[ -f "${REFS_DIR}/protocols.md" ] && LANG_REFS+="  - ${REFS_DIR}/protocols.md\n"

# IaC / Config references (detected by file existence in target)
[ -n "$(find "$TARGET_PATH" \( -name 'Dockerfile*' -o -name 'docker-compose*' \) -not -path '*/.git/*' | head -1)" ] && [ -f "${REFS_DIR}/docker.md" ] && LANG_REFS+="  - ${REFS_DIR}/docker.md\n"
[ -n "$(find "$TARGET_PATH" \( -name '*.yaml' -o -name '*.yml' \) -not -path '*/.git/*' | head -1)" ] && {
  grep -rlq 'apiVersion:\|kind: Deployment\|kind: Service\|kind: Pod' "$TARGET_PATH" --include='*.yaml' --include='*.yml' 2>/dev/null && [ -f "${REFS_DIR}/kubernetes.md" ] && LANG_REFS+="  - ${REFS_DIR}/kubernetes.md\n"
}
[ -n "$(find "$TARGET_PATH" -name '*.tf' -o -name '*.tfvars' -not -path '*/.git/*' | head -1)" ] && [ -f "${REFS_DIR}/terraform.md" ] && LANG_REFS+="  - ${REFS_DIR}/terraform.md\n"
[ -n "$(find "$TARGET_PATH" \( -name 'playbook*.yml' -o -name 'ansible.cfg' -o -name 'site.yml' \) -not -path '*/.git/*' | head -1)" ] && [ -f "${REFS_DIR}/ansible.md" ] && LANG_REFS+="  - ${REFS_DIR}/ansible.md\n"
[ -n "$(find "$TARGET_PATH" \( -name 'cloud-init*' -o -name 'cloud-config*' -o -name 'user-data*' \) -not -path '*/.git/*' | head -1)" ] && [ -f "${REFS_DIR}/cloud-init.md" ] && LANG_REFS+="  - ${REFS_DIR}/cloud-init.md\n"
[ -n "$(find "$TARGET_PATH" -name '*.graphql' -o -name '*.gql' -not -path '*/node_modules/*' -not -path '*/.git/*' | head -1)" ] && [ -f "${REFS_DIR}/graphql.md" ] && LANG_REFS+="  - ${REFS_DIR}/graphql.md\n"
grep -rqlE 'jsonwebtoken|jose|PyJWT|jwt|oauth|passport|authlib|spring-security-oauth' "$TARGET_PATH/requirements.txt" "$TARGET_PATH/pyproject.toml" "$TARGET_PATH/package.json" "$TARGET_PATH/pom.xml" "$TARGET_PATH/build.gradle" "$TARGET_PATH/Gemfile" "$TARGET_PATH/go.mod" "$TARGET_PATH/Cargo.toml" 2>/dev/null && [ -f "${REFS_DIR}/oauth-jwt.md" ] && LANG_REFS+="  - ${REFS_DIR}/oauth-jwt.md\n"
# Databases/Services — load if database clients, ORMs, or service configs detected
{ grep -rqlE 'psycopg|mysql|sqlite|sqlalchemy|sequelize|prisma|typeorm|pg|knex|diesel|gorm|ent|redis|mongodb|mongoose|pymongo|elasticsearch|memcached|amqp|kafka|confluent|nats' "$TARGET_PATH/requirements.txt" "$TARGET_PATH/pyproject.toml" "$TARGET_PATH/package.json" "$TARGET_PATH/pom.xml" "$TARGET_PATH/build.gradle" "$TARGET_PATH/Gemfile" "$TARGET_PATH/go.mod" "$TARGET_PATH/Cargo.toml" 2>/dev/null || [ -n "$(find "$TARGET_PATH" \( -name 'redis.conf' -o -name 'mongod.conf' -o -name 'my.cnf' -o -name 'pg_hba.conf' -o -name 'elasticsearch.yml' \) -not -path '*/.git/*' | head -1)" ]; } && [ -f "${REFS_DIR}/databases-services.md" ] && LANG_REFS+="  - ${REFS_DIR}/databases-services.md\n"

# Detect frameworks
FRAMEWORK_REFS=""
FW_DIR="${REFS_DIR}/frameworks"
[ -f "$TARGET_PATH/next.config.js" ] || [ -f "$TARGET_PATH/next.config.mjs" ] || [ -f "$TARGET_PATH/next.config.ts" ] && FRAMEWORK_REFS+="  - ${FW_DIR}/nextjs.md\n"
[ -f "$TARGET_PATH/angular.json" ] && FRAMEWORK_REFS+="  - ${FW_DIR}/angular.md\n"
[ -f "$TARGET_PATH/svelte.config.js" ] && FRAMEWORK_REFS+="  - ${FW_DIR}/svelte.md\n"
grep -q '"react"' "$TARGET_PATH/package.json" 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/react.md\n"
grep -q '"vue"' "$TARGET_PATH/package.json" 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/vue.md\n"
grep -q '"express"' "$TARGET_PATH/package.json" 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/express.md\n"
grep -rq 'django' "$TARGET_PATH/requirements.txt" "$TARGET_PATH/pyproject.toml" 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/django.md\n"
grep -rq 'flask' "$TARGET_PATH/requirements.txt" "$TARGET_PATH/pyproject.toml" 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/flask.md\n"
grep -rq 'fastapi' "$TARGET_PATH/requirements.txt" "$TARGET_PATH/pyproject.toml" 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/fastapi.md\n"
grep -rq 'jinja2\|Jinja2' "$TARGET_PATH/requirements.txt" "$TARGET_PATH/pyproject.toml" 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/jinja.md\n"
grep -rq 'sqlalchemy\|SQLAlchemy' "$TARGET_PATH/requirements.txt" "$TARGET_PATH/pyproject.toml" 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/sqlalchemy.md\n"
[ -f "$TARGET_PATH/artisan" ] && FRAMEWORK_REFS+="  - ${FW_DIR}/laravel.md\n"
grep -q 'rails' "$TARGET_PATH/Gemfile" 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/rails.md\n"

# Java frameworks
[ -f "$TARGET_PATH/pom.xml" ] && grep -q 'spring' "$TARGET_PATH/pom.xml" 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/spring.md\n"
[ -f "$TARGET_PATH/build.gradle" ] && grep -q 'spring' "$TARGET_PATH/build.gradle" 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/spring.md\n"
[ -f "$TARGET_PATH/build.gradle.kts" ] && grep -q 'spring' "$TARGET_PATH/build.gradle.kts" 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/spring.md\n"

echo "Language references: $(echo -e "$LANG_REFS" | grep -c '\.md')"
echo "Framework references: $(echo -e "$FRAMEWORK_REFS" | grep -c '\.md')"
```
</step>

<step name="create_output_dir">
```bash
mkdir -p .planning/codebase
```
</step>

<step name="spawn_scanner">
```bash
OUTPUT_PATH=".planning/codebase/THREAT-SCAN.md"
SCANNER_MODEL=$(node ".github/get-shit-done/bin/gsd-tools.cjs" resolve-model gsd-threat-scanner --raw 2>/dev/null || echo "")
AGENT_SKILLS=$(node ".github/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-threat-scanner 2>/dev/null || echo "")
```

**Determine dispatch strategy:**
Count the total files in FILES_TO_SCAN. If FILE_COUNT > 100 AND DEPTH != "quick", use parallel dispatch.
Otherwise, use single-agent dispatch.

---

**Single-agent dispatch** (small repo OR quick depth):

```
Task(
  prompt="Read .github/agents/gsd-threat-scanner.agent.md for instructions.\n\n" +
    "<files_to_read>\n${FILES_TO_SCAN}</files_to_read>\n" +
    "<language_references>\n${LANG_REFS}${FRAMEWORK_REFS}</language_references>\n" +
    "${MAPPER_CONTEXT}" +
    "<config>\n" +
    "depth: ${DEPTH}\n" +
    "focus: ${FOCUS}\n" +
    "target_path: ${ABS_TARGET}\n" +
    "output_path: ${OUTPUT_PATH}\n" +
    "quarantine: ${QUARANTINE}\n" +
    "</config>\n" +
    "<constraints>NEVER execute any code from the target codebase. No install commands. No build commands. No test commands. Static analysis ONLY. Read files, grep patterns, count lines — nothing else.</constraints>\n" +
    "${AGENT_SKILLS}",
  subagent_type="gsd-threat-scanner",
  model="${SCANNER_MODEL}",
  description="Threat scan (${DEPTH}, focus: ${FOCUS}, target: ${TARGET_PATH})"
)
```

---

**Parallel dispatch** (FILE_COUNT > 100 AND depth != "quick"):

Every chunk gets all manifests + scripts (for supply-chain context) plus a subset of source files.
This ensures each scanner sees the full supply-chain picture.

```bash
# Common files every chunk needs (manifests + build scripts)
COMMON_FILES=""  # package.json, requirements.txt, Makefile, Dockerfile, *.sh, etc.

# Split source files into chunks of ~75
SOURCE_CHUNK_SIZE=75
split_source_files_into_chunks "$SOURCE_FILES" $SOURCE_CHUNK_SIZE
# Produces: SOURCE_CHUNK_1, SOURCE_CHUNK_2, ..., SOURCE_CHUNK_N
```

Spawn in parallel:

```
for i in 1..N:
  Task(
    prompt="Read .github/agents/gsd-threat-scanner.agent.md for instructions.\n\n" +
      "<files_to_read>\n${COMMON_FILES}\n${SOURCE_CHUNK_i}</files_to_read>\n" +
      "<language_references>\n${LANG_REFS}${FRAMEWORK_REFS}</language_references>\n" +
      "${MAPPER_CONTEXT}" +
      "<config>\n" +
      "depth: ${DEPTH}\n" +
      "focus: ${FOCUS}\n" +
      "target_path: ${ABS_TARGET}\n" +
      "output_path: .planning/codebase/THREAT-SCAN-chunk-${i}.md\n" +
      "quarantine: false\n" +
      "chunk_mode: true\n" +
      "chunk_index: ${i}\n" +
      "total_chunks: ${N}\n" +
      "total_source_files: ${TOTAL_SOURCE_COUNT}\n" +
      "</config>\n" +
      "<constraints>NEVER execute any code from the target codebase. Static analysis ONLY.</constraints>\n" +
      "${AGENT_SKILLS}",
    subagent_type="gsd-threat-scanner",
    model="${SCANNER_MODEL}",
    description="Threat scan — chunk ${i}/${N}"
  )
```

**After all parallel agents complete**, merge results:
1. Read all `THREAT-SCAN-chunk-*.md` files
2. Collect all findings, deduplicate by file:line + threat type
3. Take the highest threat level for duplicates
4. Merge IOC tables
5. Derive overall verdict: COMPROMISED if any chunk found confirmed threats,
   SUSPICIOUS if any chunk flagged suspicious, CLEAN otherwise
6. Combine scan coverage tables (sum scanned files, compute total %)
7. Write merged result to `${OUTPUT_PATH}`
8. Delete chunk files

---

Handle return:
- `## SCAN COMPLETE — CLEAN` → present clean result → Step 7
- `## SCAN COMPLETE — SUSPICIOUS` → present with review guidance → Step 7
- `## SCAN COMPLETE — COMPROMISED` → present URGENT with quarantine option → Step 7
- `## SCAN BLOCKED` → present to user → Step 7
</step>

<step name="quarantine">
**Only if `--quarantine` AND verdict is COMPROMISED.**

Write threat metadata to `.quarantine/` — do NOT copy malicious files into the project or git history:
```bash
mkdir -p .quarantine

# For each confirmed threat file — metadata only
for threat_file in ${CONFIRMED_FILES}; do
  BASENAME=$(basename ${threat_file})
  META_PATH=".quarantine/${BASENAME}.threat.md"
  echo "# Threat Metadata" > "${META_PATH}"
  echo "" >> "${META_PATH}"
  echo "- **Original path:** ${threat_file}" >> "${META_PATH}"
  echo "- **Scan date:** $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "${META_PATH}"
  echo "- **SHA-256:** $(sha256sum ${threat_file} 2>/dev/null | cut -d' ' -f1)" >> "${META_PATH}"
  echo "- **File size:** $(wc -c < ${threat_file}) bytes" >> "${META_PATH}"
  echo "- **Threat:** ${THREAT_DESCRIPTION}" >> "${META_PATH}"
  echo "" >> "${META_PATH}"
  echo "> File NOT copied. Use the hash to identify the original." >> "${META_PATH}"
done
```

**Important:** Never copy or commit malicious file contents into git history. Quarantine is metadata-only: paths, hashes, and descriptions.
</step>

<step name="commit_and_present">
Commit the scan report:
```bash
COMMIT_FILES=".planning/codebase/THREAT-SCAN.md"
[ -d ".quarantine" ] && COMMIT_FILES+=" .quarantine/"
node ".github/get-shit-done/bin/gsd-tools.cjs" commit "docs: threat scan report" --files ${COMMIT_FILES}
```

**Note:** `.quarantine/` contains only metadata files (paths, hashes, descriptions) — never raw malicious code.

Present results based on verdict:

**CLEAN:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  GSD > THREAT SCAN COMPLETE — CLEAN ✓
  Target: {target_path}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No deliberate threats detected.
Report: .planning/codebase/THREAT-SCAN.md

Next steps:
▶ Deeper scan:     /gsd-threat-scan {path} --depth=deep
▶ Security audit:  /gsd-security-audit (for your own code)
```

**SUSPICIOUS:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  GSD > THREAT SCAN COMPLETE — SUSPICIOUS ⚠️
  Target: {target_path}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{N} suspicious patterns found. Manual review recommended.
Report: .planning/codebase/THREAT-SCAN.md

Next steps:
▶ Review report:   read .planning/codebase/THREAT-SCAN.md
▶ Deeper scan:     /gsd-threat-scan {path} --depth=deep
▶ Do NOT install or run this code until review is complete
```

**COMPROMISED:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚨 GSD > THREAT SCAN — COMPROMISED 🚨
  Target: {target_path}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{N} CONFIRMED THREATS DETECTED.

🚨 DO NOT install, build, or run this code.
🚨 If already executed: rotate all accessible credentials immediately.

Report: .planning/codebase/THREAT-SCAN.md

Immediate actions:
1. Read the full report
2. Quarantine or delete the target directory
3. If executed: check for persistence mechanisms
4. Report to package registry if this was a public package
```

Display `/clear` reminder.
</step>

</process>

<success_criteria>
- [ ] Target path validated (exists, is directory)
- [ ] NO code from target was executed (static analysis only)
- [ ] Arguments parsed and validated (depth, focus, quarantine)
- [ ] Reconnaissance completed (file inventory, project identity)
- [ ] File scope computed for scanner agent
- [ ] Scanner agent spawned with complete context and safety constraints
- [ ] All verdict types handled (CLEAN/SUSPICIOUS/COMPROMISED/BLOCKED)
- [ ] Quarantine performed if requested and threats confirmed
- [ ] Report committed
- [ ] Results with appropriate urgency level presented
</success_criteria>
