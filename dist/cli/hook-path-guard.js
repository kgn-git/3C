// PreToolUse hook that enforces the subagent path-guard policy at runtime.
//
// Claude Code passes the PreToolUse event payload on stdin; the hook
// returns exit 0 to allow the tool call or exit 2 to block it (with a
// reason on stderr). At L1 this hook only acts when invoked from a
// subagent context — main-thread tool calls always allow.
//
// Subagent context is detected via the transcript_path field: Claude
// Code writes subagent transcripts to `<...>/subagents/agent-<id>.jsonl`.
// Per AC8, no starter agent's own grant includes Edit/Write: their
// frontmatter `tools` allowlists exclude them, and Claude Code's tool
// sandbox blocks the call before the hook fires. An Edit/Write that reaches
// this hook from a subagent context comes from an agent a team added, or a
// skill run inside one; the hook holds it to the AC8 test-path rule.
//
// AC9: both starter subagents are denied Read on `.env*`, `~/.ssh/`,
// `~/.aws/` regardless of which agent is active.
import { lstat, realpath } from "node:fs/promises";
import { posix } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { hookLimitText, MAX_HOOK_EVENT_BYTES, readErrorCode, readStdinBounded, retryRoute, StdinTooLargeError, } from "../validate/_stdin.js";
const SECRET_PATTERNS = [
    /(^|[\\/:])\.env(\.[\w-]+)?$/i,
    /(^|[\\/:])\.ssh[\\/]/i,
    /(^|[\\/:])\.aws[\\/]/i,
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
/** Forward slashes, dot segments resolved; `//` (UNC) collapses to one root. */
const normal = (p) => posix.normalize(p.replace(/\\/g, "/"));
const isAbsolute = (p) => p.startsWith("/") || /^[A-Za-z]:\//.test(p);
const DRIVE = /^[A-Za-z]:/;
// Windows ignores a component's NTFS stream (`.env::$DATA`) and its
// trailing dots and spaces (`.env.`), so each opens `.env`; secret matching
// sees the name Windows would open.
const asWindowsOpens = (p) => p
    .split("/")
    .map((s, i) => {
    if (s === "." || s === "..")
        return s;
    // A leading drive (`C:`, or drive-relative `C:.env`) is kept; the rest is cleaned.
    const drive = i === 0 ? (/^[A-Za-z]:/.exec(s)?.[0] ?? "") : "";
    return drive + s.slice(drive.length).replace(/:.*$/, "").replace(/[. ]+$/, "");
})
    .join("/");
const foldFor = (base) => (s) => (DRIVE.test(base) ? s.toLowerCase() : s);
const within = (p, base, fold) => fold(p) === fold(base) || fold(p).startsWith(`${fold(base)}/`);
/**
 * The path, absolute and relative to the working folder, or null when it lies
 * outside it. A drive-relative path (`C:..\x`) resolves against that
 * drive's own current folder, and a stream name (`a.test.ts:x`) writes a hidden
 * stream, so neither is judged.
 */
function insideWorkingFolder(file, cwd) {
    const n = normal(file);
    if (DRIVE.test(n) && !/^[A-Za-z]:\//.test(n))
        return null;
    if (n.replace(DRIVE, "").includes(":"))
        return null;
    const base = normal(cwd).replace(/\/+$/, "");
    const abs = normal(isAbsolute(n) ? file : `${base}/${file}`);
    const fold = foldFor(base);
    if (!fold(abs).startsWith(`${fold(base)}/`))
        return null;
    return { abs, rel: abs.slice(base.length + 1) };
}
/**
 * False when the nearest existing folder above the target is a link out of
 * the working folder (a junction under `tests/` would carry a write elsewhere).
 * Nothing under the working folder existing means there is no link to follow.
 */
async function followsNoLinkOut(abs, cwd) {
    const base = normal(cwd).replace(/\/+$/, "");
    const fold = foldFor(base);
    // The target itself first: a test file that is a link would carry the write
    // to wherever it points. Any error but "not there" refuses.
    try {
        if ((await lstat(abs)).isSymbolicLink())
            return false;
        const [real, realBase] = await Promise.all([realpath(abs), realpath(base)]);
        return within(normal(real), normal(realBase), foldFor(normal(realBase)));
    }
    catch (e) {
        if (e.code !== "ENOENT")
            return false;
    }
    for (let dir = posix.dirname(abs); within(dir, base, fold); dir = posix.dirname(dir)) {
        try {
            const [real, realBase] = await Promise.all([realpath(dir), realpath(base)]);
            return within(normal(real), normal(realBase), foldFor(normal(realBase)));
        }
        catch {
            if (posix.dirname(dir) === dir)
                break;
        }
    }
    return true;
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
    const raw = event.tool_input?.file_path ?? "";
    // Judged after dot segments resolve: `tests/../.claude/settings.json`
    // names no test folder.
    const path = normal(raw);
    if (!SUBAGENT_ALLOWED_TOOLS.has(tool)) {
        return {
            exitCode: 2,
            stderr: `${slug} hook path-guard: tool ${tool} not permitted in subagent context (allowlist: Read, Grep, Glob, Edit, Write)\n`,
        };
    }
    if (tool === "Read" && [raw, path, asWindowsOpens(path)].some(isSecretPath)) {
        return {
            exitCode: 2,
            stderr: `${slug} hook path-guard: Read denied on protected secret-path ${path}\n`,
        };
    }
    // A path outside the working folder is no test path, whatever its folder
    // names; with no working folder to compare against, nothing is written.
    const cwd = typeof event.cwd === "string" && event.cwd !== "" ? event.cwd : null;
    const at = cwd === null ? null : insideWorkingFolder(raw, cwd);
    if ((tool === "Edit" || tool === "Write") && (at === null || !isTestPath(at.rel) || !(await followsNoLinkOut(at.abs, cwd)))) {
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
        // DENY, explicitly exit 2 — Claude Code treats any other non-zero
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