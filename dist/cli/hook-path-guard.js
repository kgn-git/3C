// PreToolUse hook that enforces the subagent path-guard policy at runtime.
//
// Claude Code passes the PreToolUse event payload on stdin; the hook
// returns exit 0 to allow the tool call or exit 2 to block it (with a
// reason on stderr). At L1 this hook only acts when invoked from a
// subagent context — main-thread tool calls always allow.
//
// Subagent context is detected via the transcript_path field: Claude
// Code writes subagent transcripts to `<...>/subagents/agent-<id>.jsonl`.
// Per AC8, code-reviewer cannot reach Edit/Write because its frontmatter
// `tools` allowlist excludes them — Claude Code's tool sandbox blocks
// the call before the hook fires. So any Edit/Write reaching this hook
// from a subagent context is test-author by construction; the hook
// applies the AC8 test-path-prefix rule uniformly.
//
// AC9: both starter subagents are denied Read on `.env*`, `~/.ssh/`,
// `~/.aws/` regardless of which agent is active.
import { resolveBrandSlugSync } from "../branding/runtime.js";
const SECRET_PATTERNS = [
    /(^|[\\/])\.env(\.[\w-]+)?$/,
    /[\\/]\.ssh[\\/]/,
    /[\\/]\.aws[\\/]/,
];
const TEST_PATH_PATTERNS = [
    /(^|[\\/])tests[\\/]/,
    /\.test\.[a-zA-Z0-9]+$/,
];
const SUBAGENT_CONTEXT = /[\\/]subagents[\\/]agent-/;
const SUBAGENT_ALLOWED_TOOLS = new Set([
    "Read",
    "Grep",
    "Glob",
    "Edit",
    "Write",
]);
function isSecretPath(p) {
    return SECRET_PATTERNS.some((r) => r.test(p));
}
function isTestPath(p) {
    return TEST_PATH_PATTERNS.some((r) => r.test(p));
}
function isSubagentContext(transcriptPath) {
    if (!transcriptPath)
        return false;
    return SUBAGENT_CONTEXT.test(transcriptPath);
}
export async function runHookPathGuard(stdin) {
    const slug = resolveBrandSlugSync();
    let event;
    try {
        event = JSON.parse(stdin);
    }
    catch (err) {
        return {
            exitCode: 0,
            stderr: `${slug} hook path-guard: could not parse event JSON (${err.message}); allowing\n`,
        };
    }
    if (!isSubagentContext(event.transcript_path)) {
        return { exitCode: 0, stderr: "" };
    }
    const tool = event.tool_name ?? "";
    const path = event.tool_input?.file_path ?? "";
    if (!SUBAGENT_ALLOWED_TOOLS.has(tool)) {
        return {
            exitCode: 2,
            stderr: `${slug} hook path-guard: tool ${tool} not permitted in subagent context (allowlist: Read, Grep, Glob, Edit, Write)\n`,
        };
    }
    if (tool === "Read" && isSecretPath(path)) {
        return {
            exitCode: 2,
            stderr: `${slug} hook path-guard: Read denied on protected secret-path ${path}\n`,
        };
    }
    if ((tool === "Edit" || tool === "Write") && !isTestPath(path)) {
        return {
            exitCode: 2,
            stderr: `${slug} hook path-guard: ${tool} scoped to tests/** and **/*.test.* in subagent context — ${path} is out of scope\n`,
        };
    }
    return { exitCode: 0, stderr: "" };
}
export async function hookPathGuardCli() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const stdin = Buffer.concat(chunks).toString("utf-8");
    const result = await runHookPathGuard(stdin);
    if (result.stderr) {
        process.stderr.write(result.stderr);
    }
    return result.exitCode;
}
//# sourceMappingURL=hook-path-guard.js.map