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
import { hookLimitText, MAX_HOOK_EVENT_BYTES, readErrorCode, readStdinBounded, retryRoute, StdinTooLargeError, } from "../validate/_stdin.js";
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
export async function hookPathGuardCli(io = { stdin: process.stdin, stderr: process.stderr }) {
    let stdin;
    try {
        stdin = await readStdinBounded(io.stdin, MAX_HOOK_EVENT_BYTES);
    }
    catch (err) {
        // #416: DENY, explicitly exit 2 — Claude Code treats any other non-zero
        // exit as "proceed", so an escaping throw is an allow. Over the cap, an
        // allow would let a subagent pad a Write past this guard; on any other
        // read failure the guard simply does not know what it is judging. The
        // event is unread, so the main thread is denied too: the accepted cost of
        // a 16 MiB bound, with the route stated.
        const slug = resolveBrandSlugSync();
        io.stderr.write(err instanceof StdinTooLargeError
            ? `${slug} hook path-guard: ${hookLimitText(err)}; denied. Write the content in parts under the limit: ` +
                `one Write, then an Edit per further part, each anchored on the last line already written.\n`
            : `${slug} hook path-guard: could not read the event (${readErrorCode(err)}); denied. ${retryRoute(slug)}\n`);
        return 2;
    }
    const result = await runHookPathGuard(stdin);
    if (result.stderr) {
        io.stderr.write(result.stderr);
    }
    return result.exitCode;
}
//# sourceMappingURL=hook-path-guard.js.map