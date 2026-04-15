<purpose>
Proactively scan own codebase for security vulnerabilities, exposed secrets, dependency CVEs,
and misconfigurations. Spawns gsd-security-scanner agent. Produces SECURITY-AUDIT.md.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<available_agent_types>
- gsd-security-scanner: Scans own codebase for security vulnerabilities
</available_agent_types>

<process>

<step name="initialize">
Parse arguments:

```bash
DEPTH="standard"
FOCUS="all"
FILES_OVERRIDE=""

for arg in $ARGUMENTS; do
  case "$arg" in
    --depth=*) DEPTH="${arg#--depth=}" ;;
    --focus=*) FOCUS="${arg#--focus=}" ;;
    --files=*) FILES_OVERRIDE="${arg#--files=}" ;;
  esac
done
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
  deps|secrets|code|config|all) ;; # valid
  *) echo "Warning: Invalid focus '${FOCUS}'. Using 'all'."; FOCUS="all" ;;
esac
```

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  GSD > SECURITY AUDIT
  Depth: {depth} | Focus: {focus}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
</step>

<step name="detect_project">
Detect project type and package manager:

```bash
# Detect language/framework
LANGUAGE="unknown"
PKG_MANAGER="none"

if [ -f "package.json" ]; then LANGUAGE="javascript"; PKG_MANAGER="npm"; fi
if [ -f "yarn.lock" ]; then PKG_MANAGER="yarn"; fi
if [ -f "pnpm-lock.yaml" ]; then PKG_MANAGER="pnpm"; fi
if [ -f "requirements.txt" ] || [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then LANGUAGE="python"; PKG_MANAGER="pip"; fi
if [ -f "Pipfile" ]; then PKG_MANAGER="pipenv"; fi
if [ -f "poetry.lock" ]; then PKG_MANAGER="poetry"; fi
if [ -f "uv.lock" ]; then PKG_MANAGER="uv"; fi
if [ -f "go.mod" ]; then LANGUAGE="go"; PKG_MANAGER="go"; fi
if [ -f "Cargo.toml" ]; then LANGUAGE="rust"; PKG_MANAGER="cargo"; fi
if [ -f "Gemfile" ]; then LANGUAGE="ruby"; PKG_MANAGER="bundler"; fi
```

Count files to scan:
```bash
if [ -n "$FILES_OVERRIDE" ]; then
  IFS=',' read -ra SCAN_FILES <<< "$FILES_OVERRIDE"
  FILE_COUNT=${#SCAN_FILES[@]}
else
  FILE_COUNT=$(find . -type f \
    -not -path '*/node_modules/*' \
    -not -path '*/.git/*' \
    -not -path '*/vendor/*' \
    -not -path '*/__pycache__/*' \
    -not -path '*/.planning/*' \
    -not -name '*.lock' \
    -not -name 'package-lock.json' \
    | wc -l)
fi
```

If FILE_COUNT is 0:
```
No source files found. Nothing to scan.
```
Exit workflow.
</step>

<step name="compute_file_scope">
Build the list of files to scan:

**If --files override provided:**
```bash
FILES_TO_SCAN=""
for f in "${SCAN_FILES[@]}"; do
  if [ -f "$f" ]; then
    FILES_TO_SCAN+="  - ${f}\n"
  else
    echo "Warning: File not found, skipping: ${f}"
  fi
done
```

**Otherwise, compute based on focus:**
```bash
FILES_TO_SCAN=""

# Always include manifests and configs
for f in package.json requirements.txt pyproject.toml setup.py setup.cfg go.mod Cargo.toml Gemfile; do
  [ -f "$f" ] && FILES_TO_SCAN+="  - ${f}\n"
done

# Include Dockerfiles and CI configs
for f in $(find . -name "Dockerfile*" -o -name "docker-compose*" -o -name ".dockerignore" 2>/dev/null | head -10); do
  FILES_TO_SCAN+="  - ${f}\n"
done
for f in $(find .github/workflows -name "*.yml" -o -name "*.yaml" 2>/dev/null | head -10); do
  FILES_TO_SCAN+="  - ${f}\n"
done

# Include .gitignore for secret exclusion analysis
[ -f ".gitignore" ] && FILES_TO_SCAN+="  - .gitignore\n"

# Include source files (no hard cap — parallel dispatch handles large repos)
if [ "$FOCUS" = "code" ] || [ "$FOCUS" = "secrets" ] || [ "$FOCUS" = "all" ]; then
  SOURCE_FILES=$(find . -type f \
    \( -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \
       -o -name "*.go" -o -name "*.rs" -o -name "*.rb" -o -name "*.java" -o -name "*.kt" \
       -o -name "*.php" -o -name "*.cs" -o -name "*.swift" -o -name "*.c" -o -name "*.cpp" \
       -o -name "*.h" -o -name "*.hpp" -o -name "*.dart" -o -name "*.pl" -o -name "*.pm" \
       -o -name "*.lua" -o -name "*.html" -o -name "*.htm" -o -name "*.css" \
       -o -name "*.sh" -o -name "*.bash" -o -name "*.zsh" \
       -o -name "*.ps1" -o -name "*.psm1" -o -name "*.psd1" \
       -o -name "*.tf" -o -name "*.tfvars" \
       -o -name "*.graphql" -o -name "*.gql" \
       -o -name "Dockerfile" -o -name "Dockerfile.*" -o -name "docker-compose*.yml" \
       -o -name "*.yaml" -o -name "*.yml" \) \
    -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/vendor/*' \
    -not -path '*/__pycache__/*' -not -path '*/.planning/*')
  SOURCE_FILE_COUNT=$(echo "$SOURCE_FILES" | wc -l)
  for f in $SOURCE_FILES; do
    FILES_TO_SCAN+="  - ${f}\n"
  done
fi
```
</step>

<step name="load_mapper_intel">
**Optional accelerator — skip if .planning/codebase/ does not exist.**

If a previous `/gsd-map-codebase` run produced codebase documents, load them as supplementary context.
This lets the scanner skip redundant language/framework detection and provides pre-mapped entry points
for taint tracking (deep mode).

```bash
MAPPER_CONTEXT=""

if [ -f ".planning/codebase/STACK.md" ]; then
  MAPPER_CONTEXT+="<mapper_intel>\n"
  MAPPER_CONTEXT+="The following codebase analysis is available from a previous /gsd-map-codebase run.\n"
  MAPPER_CONTEXT+="Use it to: skip project detection, identify frameworks for reference loading,\n"
  MAPPER_CONTEXT+="locate entry points for taint tracking, and narrow scope to high-risk areas.\n\n"

  for doc in STACK.md ARCHITECTURE.md INTEGRATIONS.md CONCERNS.md; do
    if [ -f ".planning/codebase/${doc}" ]; then
      MAPPER_CONTEXT+="--- ${doc} ---\n"
      MAPPER_CONTEXT+="$(cat .planning/codebase/${doc})\n\n"
    fi
  done

  MAPPER_CONTEXT+="</mapper_intel>\n"
  echo "Loaded mapper intel: $(ls .planning/codebase/{STACK,ARCHITECTURE,INTEGRATIONS,CONCERNS}.md 2>/dev/null | wc -l) documents"
else
  echo "No mapper intel found (.planning/codebase/STACK.md missing). Running standalone."
fi
```
</step>

<step name="resolve_language_references">
Determine which language and framework reference files to include based on detected languages
and project files. These provide detailed, language-specific vulnerability checks.

```bash
LANG_REFS=""
REFS_DIR=".github/get-shit-done/references/languages"

# Map detected languages to reference files
declare -A LANG_MAP=(
  [python]="python.md"
  [javascript]="javascript-typescript.md"
  [typescript]="javascript-typescript.md"
  [go]="go.md"
  [rust]="rust.md"
  [java]="java.md"
  [ruby]="ruby.md"
  [php]="php.md"
  [csharp]="csharp.md"
  [swift]="swift.md"
  [kotlin]="kotlin.md"
  [c]="c-cpp.md"
  [cpp]="c-cpp.md"
  [dart]="dart-flutter.md"
  [perl]="perl.md"
  [lua]="lua.md"
  [shell]="shell-bash.md"
  [powershell]="powershell.md"
)

# Detect all languages present in source files
DETECTED_LANGS=""
[ -n "$(find . -name '*.py' -not -path '*/node_modules/*' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="python "
[ -n "$(find . \( -name '*.js' -o -name '*.ts' -o -name '*.jsx' -o -name '*.tsx' \) -not -path '*/node_modules/*' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="javascript "
[ -n "$(find . -name '*.go' -not -path '*/vendor/*' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="go "
[ -n "$(find . -name '*.rs' -not -path '*/target/*' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="rust "
[ -n "$(find . \( -name '*.java' -o -name '*.kt' \) -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="java "
[ -n "$(find . -name '*.kt' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="kotlin "
[ -n "$(find . -name '*.rb' -not -path '*/vendor/*' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="ruby "
[ -n "$(find . -name '*.php' -not -path '*/vendor/*' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="php "
[ -n "$(find . -name '*.cs' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="csharp "
[ -n "$(find . -name '*.swift' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="swift "
[ -n "$(find . \( -name '*.c' -o -name '*.cpp' -o -name '*.h' -o -name '*.hpp' \) -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="c "
[ -n "$(find . -name '*.dart' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="dart "
[ -n "$(find . -name '*.pl' -o -name '*.pm' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="perl "
[ -n "$(find . -name '*.lua' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="lua "
[ -n "$(find . \( -name '*.html' -o -name '*.htm' -o -name '*.css' \) -not -path '*/node_modules/*' -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="html "
[ -n "$(find . \( -name '*.sh' -o -name '*.bash' -o -name '*.zsh' \) -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="shell "
[ -n "$(find . \( -name '*.ps1' -o -name '*.psm1' -o -name '*.psd1' \) -not -path '*/.git/*' | head -1)" ] && DETECTED_LANGS+="powershell "

# Build reference file list
for lang in $DETECTED_LANGS; do
  REF="${LANG_MAP[$lang]}"
  if [ -n "$REF" ] && [ -f "${REFS_DIR}/${REF}" ]; then
    LANG_REFS+="  - ${REFS_DIR}/${REF}\n"
  fi
done

# Always include HTML/CSS if web project
if [ -n "$(echo $DETECTED_LANGS | grep -E 'javascript|php|ruby|python')" ]; then
  [ -f "${REFS_DIR}/html-css.md" ] && LANG_REFS+="  - ${REFS_DIR}/html-css.md\n"
fi

# Always include protocol reference
[ -f "${REFS_DIR}/protocols.md" ] && LANG_REFS+="  - ${REFS_DIR}/protocols.md\n"

# IaC / Config references (detected by file existence)
[ -n "$(find . \( -name 'Dockerfile*' -o -name 'docker-compose*' -o -name '.dockerignore' \) -not -path '*/.git/*' | head -1)" ] && [ -f "${REFS_DIR}/docker.md" ] && LANG_REFS+="  - ${REFS_DIR}/docker.md\n"
[ -n "$(find . \( -name '*.yaml' -o -name '*.yml' \) -not -path '*/.git/*' | head -1)" ] && {
  grep -rlq 'apiVersion:\|kind: Deployment\|kind: Service\|kind: Pod' . --include='*.yaml' --include='*.yml' 2>/dev/null && [ -f "${REFS_DIR}/kubernetes.md" ] && LANG_REFS+="  - ${REFS_DIR}/kubernetes.md\n"
}
[ -n "$(find . -name '*.tf' -o -name '*.tfvars' -not -path '*/.git/*' | head -1)" ] && [ -f "${REFS_DIR}/terraform.md" ] && LANG_REFS+="  - ${REFS_DIR}/terraform.md\n"
[ -n "$(find . \( -name 'playbook*.yml' -o -name 'ansible.cfg' -o -name 'inventory' -o -name 'site.yml' \) -not -path '*/.git/*' | head -1)" ] && [ -f "${REFS_DIR}/ansible.md" ] && LANG_REFS+="  - ${REFS_DIR}/ansible.md\n"
[ -n "$(find . \( -name 'cloud-init*' -o -name 'cloud-config*' -o -name 'user-data*' \) -not -path '*/.git/*' | head -1)" ] && [ -f "${REFS_DIR}/cloud-init.md" ] && LANG_REFS+="  - ${REFS_DIR}/cloud-init.md\n"
[ -n "$(find . -name '*.graphql' -o -name '*.gql' -not -path '*/node_modules/*' -not -path '*/.git/*' | head -1)" ] && [ -f "${REFS_DIR}/graphql.md" ] && LANG_REFS+="  - ${REFS_DIR}/graphql.md\n"
# OAuth/JWT — load if project has auth dependencies
grep -rqlE 'jsonwebtoken|jose|PyJWT|jwt|oauth|passport|authlib|spring-security-oauth' requirements.txt pyproject.toml package.json pom.xml build.gradle Gemfile go.mod Cargo.toml 2>/dev/null && [ -f "${REFS_DIR}/oauth-jwt.md" ] && LANG_REFS+="  - ${REFS_DIR}/oauth-jwt.md\n"
# Databases/Services — load if database clients, ORMs, or service configs detected
{ grep -rqlE 'psycopg|mysql|sqlite|sqlalchemy|sequelize|prisma|typeorm|pg|knex|diesel|gorm|ent|redis|mongodb|mongoose|pymongo|elasticsearch|memcached|amqp|kafka|confluent|nats' requirements.txt pyproject.toml package.json pom.xml build.gradle Gemfile go.mod Cargo.toml 2>/dev/null || [ -n "$(find . \( -name 'redis.conf' -o -name 'mongod.conf' -o -name 'my.cnf' -o -name 'pg_hba.conf' -o -name 'elasticsearch.yml' \) -not -path '*/.git/*' | head -1)" ]; } && [ -f "${REFS_DIR}/databases-services.md" ] && LANG_REFS+="  - ${REFS_DIR}/databases-services.md\n"

# Detect frameworks and add framework-specific references
FRAMEWORK_REFS=""
FW_DIR="${REFS_DIR}/frameworks"

# JS/TS frameworks
[ -f "next.config.js" ] || [ -f "next.config.mjs" ] || [ -f "next.config.ts" ] && FRAMEWORK_REFS+="  - ${FW_DIR}/nextjs.md\n"
[ -f "nuxt.config.ts" ] || [ -f "nuxt.config.js" ] && FRAMEWORK_REFS+="  - ${FW_DIR}/vue.md\n"
[ -f "angular.json" ] && FRAMEWORK_REFS+="  - ${FW_DIR}/angular.md\n"
[ -f "svelte.config.js" ] || [ -f "svelte.config.ts" ] && FRAMEWORK_REFS+="  - ${FW_DIR}/svelte.md\n"
grep -q '"react"' package.json 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/react.md\n"
grep -q '"vue"' package.json 2>/dev/null && [ -z "$(echo $FRAMEWORK_REFS | grep vue)" ] && FRAMEWORK_REFS+="  - ${FW_DIR}/vue.md\n"
grep -q '"express"' package.json 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/express.md\n"

# Python frameworks
grep -rq 'django' requirements.txt pyproject.toml setup.py 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/django.md\n"
grep -rq 'flask' requirements.txt pyproject.toml setup.py 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/flask.md\n"
grep -rq 'fastapi' requirements.txt pyproject.toml setup.py 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/fastapi.md\n"
grep -rq 'jinja2\|Jinja2' requirements.txt pyproject.toml setup.py 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/jinja.md\n"
grep -rq 'sqlalchemy\|SQLAlchemy' requirements.txt pyproject.toml setup.py 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/sqlalchemy.md\n"

# PHP frameworks
[ -f "artisan" ] && FRAMEWORK_REFS+="  - ${FW_DIR}/laravel.md\n"
[ -f "bin/console" ] && [ -f "symfony.lock" ] && FRAMEWORK_REFS+="  - ${FW_DIR}/symfony.md\n"

# Ruby frameworks
[ -f "Gemfile" ] && grep -q 'rails' Gemfile 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/rails.md\n"

# Java frameworks
[ -f "pom.xml" ] && grep -q 'spring' pom.xml 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/spring.md\n"
[ -f "build.gradle" ] && grep -q 'spring' build.gradle 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/spring.md\n"
[ -f "build.gradle.kts" ] && grep -q 'spring' build.gradle.kts 2>/dev/null && FRAMEWORK_REFS+="  - ${FW_DIR}/spring.md\n"

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
OUTPUT_PATH=".planning/codebase/SECURITY-AUDIT.md"
SCANNER_MODEL=$(node ".github/get-shit-done/bin/gsd-tools.cjs" resolve-model gsd-security-scanner --raw 2>/dev/null || echo "")
AGENT_SKILLS=$(node ".github/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-security-scanner 2>/dev/null || echo "")
```

**Determine dispatch strategy:**
Count the total source files. If SOURCE_FILE_COUNT > 75 AND FOCUS = "all", use parallel dispatch.
Otherwise, use single-agent dispatch.

---

**Single-agent dispatch** (focus != "all" OR small repo):

```
Task(
  prompt="Read .github/agents/gsd-security-scanner.agent.md for instructions.\n\n" +
    "<required_reading>\n${FILES_TO_SCAN}</required_reading>\n" +
    "<language_references>\n${LANG_REFS}${FRAMEWORK_REFS}</language_references>\n" +
    "${MAPPER_CONTEXT}" +
    "<config>\n" +
    "depth: ${DEPTH}\n" +
    "focus: ${FOCUS}\n" +
    "output_path: ${OUTPUT_PATH}\n" +
    "language: ${LANGUAGE}\n" +
    "package_manager: ${PKG_MANAGER}\n" +
    "</config>\n" +
    "<constraints>Implementation files are read-only. Never include actual secret values in the report. Redact to pattern only.</constraints>\n" +
    "${AGENT_SKILLS}",
  subagent_type="gsd-security-scanner",
  model="${SCANNER_MODEL}",
  description="Security audit (${DEPTH}, focus: ${FOCUS})"
)
```

---

**Parallel dispatch** (focus = "all" AND SOURCE_FILE_COUNT > 75):

Split the scan into focus-specific parallel agents. Each agent scans a subset:

```bash
# Build focus-specific file lists
DEPS_FILES=""       # manifests: package.json, requirements.txt, pyproject.toml, go.mod, Cargo.toml, lockfiles
CONFIG_FILES=""     # Dockerfiles, CI workflows, .gitignore, env files
SOURCE_CHUNK_SIZE=75

# Split source files into chunks of ~75
split_source_files_into_chunks "$SOURCE_FILES" $SOURCE_CHUNK_SIZE
# Produces: SOURCE_CHUNK_1, SOURCE_CHUNK_2, ..., SOURCE_CHUNK_N
```

Spawn in parallel:

```
# Agent 1: Dependencies + Config (small file set, fast)
Task(
  prompt="Read .github/agents/gsd-security-scanner.agent.md for instructions.\n\n" +
    "<required_reading>\n${DEPS_FILES}\n${CONFIG_FILES}</required_reading>\n" +
    "<language_references>\n${LANG_REFS}${FRAMEWORK_REFS}</language_references>\n" +
    "${MAPPER_CONTEXT}" +
    "<config>\n" +
    "depth: ${DEPTH}\n" +
    "focus: deps,config\n" +
    "output_path: .planning/codebase/SECURITY-AUDIT-chunk-deps.md\n" +
    "language: ${LANGUAGE}\n" +
    "package_manager: ${PKG_MANAGER}\n" +
    "chunk_mode: true\n" +
    "total_source_files: ${SOURCE_FILE_COUNT}\n" +
    "</config>\n" +
    "<constraints>Implementation files are read-only. Never include actual secret values in the report.</constraints>\n" +
    "${AGENT_SKILLS}",
  subagent_type="gsd-security-scanner",
  model="${SCANNER_MODEL}",
  description="Security audit — deps + config"
)

# Agent 2..N: Source code chunks (secrets + OWASP)
for i in 1..N:
  Task(
    prompt="Read .github/agents/gsd-security-scanner.agent.md for instructions.\n\n" +
      "<required_reading>\n${SOURCE_CHUNK_i}</required_reading>\n" +
      "<language_references>\n${LANG_REFS}${FRAMEWORK_REFS}</language_references>\n" +
      "${MAPPER_CONTEXT}" +
      "<config>\n" +
      "depth: ${DEPTH}\n" +
      "focus: secrets,code\n" +
      "output_path: .planning/codebase/SECURITY-AUDIT-chunk-${i}.md\n" +
      "language: ${LANGUAGE}\n" +
      "package_manager: ${PKG_MANAGER}\n" +
      "chunk_mode: true\n" +
      "chunk_index: ${i}\n" +
      "total_chunks: ${N}\n" +
      "total_source_files: ${SOURCE_FILE_COUNT}\n" +
      "</config>\n" +
      "<constraints>Implementation files are read-only. Never include actual secret values in the report.</constraints>\n" +
      "${AGENT_SKILLS}",
    subagent_type="gsd-security-scanner",
    model="${SCANNER_MODEL}",
    description="Security audit — source chunk ${i}/${N}"
  )
```

**After all parallel agents complete**, merge results:
1. Read all `SECURITY-AUDIT-chunk-*.md` files
2. Deduplicate findings (same file:line + same issue = one finding)
3. Take the highest severity classification for duplicates
4. Combine scan coverage tables (sum files checked, compute total %)
5. Write merged result to `${OUTPUT_PATH}`
6. Delete chunk files

---

Handle return:
- `## AUDIT COMPLETE` → present results → Step 6
- `## AUDIT BLOCKED` → present to user → Step 6
</step>

<step name="commit_and_present">
Commit the audit report:
```bash
node ".github/get-shit-done/bin/gsd-tools.cjs" commit "docs: security audit report" --files .planning/codebase/SECURITY-AUDIT.md
```

Parse findings counts from agent output and present summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  GSD > SECURITY AUDIT COMPLETE
  Risk Rating: {CRITICAL/HIGH/MODERATE/LOW/CLEAN}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Findings:
  Critical:  {N}
  High:      {N}
  Medium:    {N}
  Low:       {N}
  Info:      {N}

Report: .planning/codebase/SECURITY-AUDIT.md

Next steps:
▶ Review findings: read .planning/codebase/SECURITY-AUDIT.md
▶ Re-run deeper:   /gsd-security-audit --depth=deep
```

Display `/clear` reminder.
</step>

</process>

<success_criteria>
- [ ] Arguments parsed and validated (depth, focus, files)
- [ ] Project type and package manager detected
- [ ] File scope computed (--files or automatic)
- [ ] Output directory created
- [ ] Scanner agent spawned with complete context
- [ ] Agent return handled (COMPLETE or BLOCKED)
- [ ] Report committed
- [ ] Results with routing presented
</success_criteria>
