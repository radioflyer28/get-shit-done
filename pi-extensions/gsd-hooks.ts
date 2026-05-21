// gsd-pi-extension-version: {{GSD_VERSION}}
// GSD Pi Hooks - Pi-native extension parity for core GSD advisory hooks.
//
// This extension mirrors the first layer of GSD hook behavior using Pi's
// TypeScript extension API:
// - session_start: project state orientation.
// - tool_call: read-before-edit, workflow guard, and prompt-injection warnings.
// - tool_result: read-result prompt-injection scan.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?(your\s+)?instructions/i,
  /override\s+(system|previous)\s+(prompt|instructions)/i,
  /you\s+are\s+now\s+(?:a|an|the)\s+/i,
  /act\s+as\s+(?:a|an|the)\s+(?!plan|phase|wave)/i,
  /pretend\s+(?:you(?:'re| are)\s+|to\s+be\s+)/i,
  /from\s+now\s+on,?\s+you\s+(?:are|will|should|must)/i,
  /(?:print|output|reveal|show|display|repeat)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions)/i,
  /<\/?(?:system|assistant|human)>/i,
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<<\s*SYS\s*>>/i,
];

const SUMMARIZATION_PATTERNS = [
  /when\s+(?:summari[sz]ing|compressing|compacting),?\s+(?:retain|preserve|keep)\s+(?:this|these)/i,
  /this\s+(?:instruction|directive|rule)\s+is\s+(?:permanent|persistent|immutable)/i,
  /preserve\s+(?:these|this)\s+(?:rules?|instructions?|directives?)\s+(?:in|through|after|during)/i,
  /(?:retain|keep)\s+(?:this|these)\s+(?:in|through|after)\s+(?:summar|compress|compact)/i,
];

const ALL_READ_PATTERNS = [...INJECTION_PATTERNS, ...SUMMARIZATION_PATTERNS];
const WARNING_CONTEXT_REMAINING = 35;
const CRITICAL_CONTEXT_REMAINING = 25;
const CONVENTIONAL_COMMIT_RE = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?:\s.+/;

function toolName(event: any): string {
  return String(event?.toolName || event?.tool_name || "").toLowerCase();
}

function toolInput(event: any): Record<string, any> {
  return event?.input || event?.tool_input || {};
}

function cwdFrom(ctx: any, event: any): string {
  return String(ctx?.cwd || event?.cwd || process.cwd());
}

function getFilePath(input: Record<string, any>, cwd: string): string {
  const raw = input.file_path || input.path || "";
  if (!raw || typeof raw !== "string") return "";
  return path.isAbsolute(raw) ? raw : path.resolve(cwd, raw);
}

function displayPath(filePath: string, cwd: string): string {
  if (!filePath) return "";
  const rel = path.relative(cwd, filePath);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel) ? rel : filePath;
}

function isPlanningPath(filePath: string): boolean {
  const p = filePath.replace(/\\/g, "/");
  return p.includes("/.planning/") || p.includes(".planning/");
}

function isExcludedReadPath(filePath: string): boolean {
  const p = filePath.replace(/\\/g, "/");
  return (
    isPlanningPath(p) ||
    /(?:^|\/)REVIEW\.md$/i.test(p) ||
    /CHECKPOINT/i.test(path.basename(p)) ||
    /[/\\](?:security|techsec|injection)[/\\.]/i.test(p) ||
    /security\.cjs$/.test(p) ||
    p.includes("/.claude/hooks/") ||
    p.includes("/.pi/extensions/")
  );
}

function notify(ctx: any, message: string): void {
  try {
    ctx?.ui?.notify?.(message, "warning");
  } catch {
    // Extensions must never break tool execution.
  }
}

function readGsdConfig(cwd: string): any {
  const configPath = path.join(cwd, ".planning", "config.json");
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return null;
  }
}

function isWorkflowGuardEnabled(cwd: string): boolean {
  return readGsdConfig(cwd)?.hooks?.workflow_guard === true;
}

function isCommunityHooksEnabled(cwd: string): boolean {
  return readGsdConfig(cwd)?.hooks?.community === true;
}

function getConfigValue(cwd: string, keyPath: string): any {
  const config = readGsdConfig(cwd);
  if (!config || typeof config !== "object") return undefined;
  if (keyPath in config) return config[keyPath];
  let cursor = config;
  for (const part of keyPath.split(".")) {
    if (!cursor || typeof cursor !== "object" || !(part in cursor)) return undefined;
    cursor = cursor[part];
  }
  return cursor;
}

function scanInjectionPatterns(content: string, patterns = INJECTION_PATTERNS): string[] {
  const findings: string[] = [];
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      findings.push(pattern.source.replace(/\\s\+/g, "-").replace(/[()\\]/g, "").slice(0, 50));
    }
  }
  if (/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD\u2060-\u2069]/.test(content)) {
    findings.push("invisible-unicode");
  }
  try {
    if (/[\u{E0000}-\u{E007F}]/u.test(content)) {
      findings.push("unicode-tag-block");
    }
  } catch {
    // Runtime does not support this Unicode range check.
  }
  return findings;
}

function extractResultText(event: any): string {
  const content = event?.content ?? event?.tool_response?.content ?? event?.tool_response ?? "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part.text === "string") return part.text;
      return "";
    }).join("\n");
  }
  return String(content || "");
}

function appendWarningContent(existing: any, warning: string): any {
  const warningBlock = { type: "text", text: warning };
  if (Array.isArray(existing)) return [...existing, warningBlock];
  if (typeof existing === "string") return `${existing}\n\n${warning}`;
  if (existing == null) return [warningBlock];
  return [existing, warningBlock];
}

function shellTokens(command: string): string[] {
  const tokens: string[] = [];
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(command)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3] ?? "");
  }
  return tokens;
}

function isEnvAssignment(token: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*=/.test(token);
}

function isGitToken(token: string): boolean {
  const normalized = token.replace(/\\/g, "/").toLowerCase();
  return normalized === "git" || normalized.endsWith("/git") || normalized.endsWith("/git.exe");
}

function findGitSubcommand(tokens: string[]): string | null {
  let index = 0;
  while (index < tokens.length && isEnvAssignment(tokens[index])) index++;
  if (tokens[index] === "env") {
    index++;
    while (index < tokens.length && isEnvAssignment(tokens[index])) index++;
  }
  if (!isGitToken(tokens[index] || "")) return null;
  index++;

  while (index < tokens.length) {
    const token = tokens[index];
    if (token === "-C" || token === "-c") {
      index += 2;
      continue;
    }
    if (token.startsWith("--git-dir=") || token.startsWith("--work-tree=")) {
      index++;
      continue;
    }
    if (token.startsWith("-")) {
      index++;
      continue;
    }
    return token;
  }
  return null;
}

function commitMessageFromTokens(tokens: string[]): string | null {
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token === "-m" || token === "--message") {
      return tokens[index + 1] || "";
    }
    if (token.startsWith("-m") && token.length > 2) {
      return token.slice(2);
    }
    if (token.startsWith("--message=")) {
      return token.slice("--message=".length);
    }
  }
  return null;
}

function maybeValidateCommitCommand(event: any, ctx: any): any {
  if (toolName(event) !== "bash") return undefined;
  const cwd = cwdFrom(ctx, event);
  if (!isCommunityHooksEnabled(cwd)) return undefined;

  const command = String(toolInput(event).command || "");
  if (!command) return undefined;

  const tokens = shellTokens(command);
  if (findGitSubcommand(tokens) !== "commit") return undefined;

  const message = commitMessageFromTokens(tokens);
  if (!message) return undefined;

  const subject = message.split(/\r?\n/)[0];
  if (!CONVENTIONAL_COMMIT_RE.test(subject)) {
    return {
      block: true,
      reason: "CONVENTIONAL_COMMITS_VIOLATION: Commit message must follow Conventional Commits: <type>(<scope>): <subject>.",
    };
  }
  if (subject.length > 72) {
    return {
      block: true,
      reason: "COMMIT_SUBJECT_TOO_LONG: Commit subject must be 72 characters or less.",
    };
  }
  return undefined;
}

function maybeWarnReadBeforeEdit(event: any, ctx: any): void {
  const name = toolName(event);
  if (name !== "write" && name !== "edit") return;

  const cwd = cwdFrom(ctx, event);
  const filePath = getFilePath(toolInput(event), cwd);
  if (!filePath) return;
  if (!fs.existsSync(filePath)) return;

  const fileName = path.basename(filePath);
  notify(ctx,
    `READ-BEFORE-EDIT REMINDER: You are about to modify "${fileName}" which already exists. ` +
    "If you have not already read this file in the current session, read it first before editing."
  );
}

function maybeWarnWorkflowGuard(event: any, ctx: any): void {
  const name = toolName(event);
  if (name !== "write" && name !== "edit") return;

  const input = toolInput(event);
  if (input.is_subagent || event?.session_type === "task") return;

  const cwd = cwdFrom(ctx, event);
  const filePath = getFilePath(input, cwd);
  if (!filePath || isPlanningPath(filePath)) return;

  const allowedPatterns = [/\.gitignore$/, /\.env/, /CLAUDE\.md$/, /AGENTS\.md$/, /GEMINI\.md$/, /settings\.json$/];
  if (allowedPatterns.some((pattern) => pattern.test(filePath))) return;
  if (!isWorkflowGuardEnabled(cwd)) return;

  notify(ctx,
    `WORKFLOW ADVISORY: You are editing ${path.basename(filePath)} directly without a GSD command. ` +
    "This edit will not be tracked in STATE.md or produce a SUMMARY.md. " +
    "Consider using gsd-fast or gsd-quick unless the direct edit is intentional."
  );
}

function maybeWarnPromptInjectionWrite(event: any, ctx: any): void {
  const name = toolName(event);
  if (name !== "write" && name !== "edit") return;

  const input = toolInput(event);
  const cwd = cwdFrom(ctx, event);
  const filePath = getFilePath(input, cwd);
  if (!filePath || !isPlanningPath(filePath)) return;

  const content = String(input.content || input.new_string || input.newText || "");
  if (!content) return;

  const findings = scanInjectionPatterns(content);
  if (findings.length === 0) return;

  notify(ctx,
    `PROMPT INJECTION WARNING: Content being written to ${path.basename(filePath)} triggered ` +
    `${findings.length} injection detection pattern(s): ${findings.join(", ")}. ` +
    "Review the text for embedded instructions that could manipulate agent behavior."
  );
}

function maybeSessionState(event: any, ctx: any): void {
  const cwd = cwdFrom(ctx, event);
  if (!isCommunityHooksEnabled(cwd)) return;

  const statePath = path.join(cwd, ".planning", "STATE.md");
  const config = readGsdConfig(cwd);
  const configMode = String(config?.mode || "unknown");
  let lines = ["Project State Reminder", ""];

  if (fs.existsSync(statePath)) {
    const stateHead = fs.readFileSync(statePath, "utf8").split(/\r?\n/).slice(0, 20).join("\n");
    lines = lines.concat(["STATE.md exists - check for blockers and current phase.", stateHead]);
  } else {
    lines.push("No .planning/STATE.md found - suggest gsd-new-project if starting new work.");
  }
  lines.push("", `Config mode: ${configMode}`);

  try {
    ctx?.ui?.setWidget?.("gsd-session-state", lines);
    ctx?.ui?.setStatus?.("gsd", statePath && fs.existsSync(statePath) ? `GSD: ${configMode} state loaded` : "GSD: no STATE.md");
    ctx?.ui?.notify?.("GSD project state reminder loaded.", "info");
  } catch {
    // Advisory only.
  }
}

function maybeScanReadResult(event: any, ctx: any): any {
  const name = toolName(event);
  if (name !== "read") return undefined;

  const cwd = cwdFrom(ctx, event);
  const filePath = getFilePath(toolInput(event), cwd);
  if (!filePath || isExcludedReadPath(filePath)) return undefined;

  const content = extractResultText(event);
  if (!content || content.length < 20) return undefined;

  const findings = scanInjectionPatterns(content, ALL_READ_PATTERNS);
  if (findings.length === 0) return undefined;

  const severity = findings.length >= 3 ? "HIGH" : "LOW";
  const detail = severity === "HIGH"
    ? "Multiple patterns are a strong injection signal. Review the file before proceeding."
    : "Single pattern match may be a false positive. Proceed with awareness.";
  const warning =
    `READ INJECTION SCAN [${severity}]: File "${path.basename(filePath)}" triggered ` +
    `${findings.length} pattern(s): ${findings.join(", ")}. ${detail} Source: ${displayPath(filePath, cwd)}`;

  notify(ctx, warning);
  if (event?.content == null) return undefined;
  return { content: appendWarningContent(event?.content, warning) };
}

function maybeWarnPhaseBoundary(event: any, ctx: any): any {
  const name = toolName(event);
  if (name !== "write" && name !== "edit") return undefined;

  const cwd = cwdFrom(ctx, event);
  if (!isCommunityHooksEnabled(cwd)) return undefined;

  const filePath = getFilePath(toolInput(event), cwd);
  if (!filePath || !isPlanningPath(filePath)) return undefined;

  const source = displayPath(filePath, cwd).replace(/\\/g, "/");
  const warning = `.planning/ file modified: ${source}\nCheck: Should STATE.md be updated to reflect this change?`;
  notify(ctx, warning);
  if (event?.content == null) return undefined;
  return { content: appendWarningContent(event.content, warning) };
}

function usageNumber(usage: any, keys: string[]): number | null {
  for (const key of keys) {
    const value = usage?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function maybeWarnContextUsage(event: any, ctx: any): any {
  if (typeof ctx?.getContextUsage !== "function") return undefined;

  const cwd = cwdFrom(ctx, event);
  if (getConfigValue(cwd, "hooks.context_warnings") === false) return undefined;

  let usage: any;
  try {
    usage = ctx.getContextUsage();
  } catch {
    return undefined;
  }
  if (!usage) return undefined;

  const remaining = usageNumber(usage, ["remainingPercentage", "remaining_percentage", "remainingPercent"]);
  if (remaining == null || remaining > WARNING_CONTEXT_REMAINING) return undefined;

  const used = usageNumber(usage, ["usedPercentage", "used_pct", "usedPercent"]) ?? Math.max(0, 100 - remaining);
  const isCritical = remaining <= CRITICAL_CONTEXT_REMAINING;
  const isGsdActive = fs.existsSync(path.join(cwd, ".planning", "STATE.md"));
  const level = isCritical ? "CRITICAL" : "WARNING";
  const detail = isCritical
    ? (isGsdActive
      ? "Context is nearly exhausted. GSD state is tracked in STATE.md; inform the user before starting new complex work."
      : "Context is nearly exhausted. Inform the user and avoid starting new complex work.")
    : "Context is getting limited. Avoid unnecessary exploration or starting new complex work.";
  const warning = `CONTEXT ${level}: Usage at ${used}%. Remaining: ${remaining}%. ${detail}`;

  try {
    ctx?.ui?.setStatus?.("gsd-context", `${remaining}% remaining`);
  } catch {
    // Advisory only.
  }
  notify(ctx, warning);
  if (event?.content == null) return undefined;
  return { content: appendWarningContent(event.content, warning) };
}

function mergeToolResultPatch(event: any, current: any, next: any): any {
  if (!next || typeof next !== "object") return current;
  const merged = { ...(current || {}), ...next };
  if ("content" in next) {
    event.content = next.content;
  }
  return merged;
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => {
    try {
      maybeSessionState(event, ctx);
    } catch {
      // Advisory only.
    }
  });

  pi.on("tool_call", async (event, ctx) => {
    try {
      maybeWarnReadBeforeEdit(event, ctx);
      maybeWarnWorkflowGuard(event, ctx);
      maybeWarnPromptInjectionWrite(event, ctx);
      return maybeValidateCommitCommand(event, ctx);
    } catch {
      // Advisory only.
    }
  });

  pi.on("tool_result", async (event, ctx) => {
    try {
      let patch: any;
      patch = mergeToolResultPatch(event, patch, maybeScanReadResult(event, ctx));
      patch = mergeToolResultPatch(event, patch, maybeWarnPhaseBoundary(event, ctx));
      patch = mergeToolResultPatch(event, patch, maybeWarnContextUsage(event, ctx));
      return patch;
    } catch {
      return undefined;
    }
  });
}
