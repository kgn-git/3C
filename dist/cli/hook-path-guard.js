// PreToolUse hook that keeps subagents read-only at runtime.
//
// Claude Code passes the PreToolUse event payload on stdin; the hook returns
// exit 0 to allow the tool call or exit 2 to block it (with a reason on
// stderr). It acts only in a subagent context — main-session tool calls are
// the developer's own, seen and approved there.
//
// Subagent context is detected via the transcript_path field: Claude Code
// writes subagent transcripts to `<...>/subagents/agent-<id>.jsonl`. A
// subagent may Read, Grep and Glob, and nothing else: no Edit, Write or
// shell, whatever the path or command. Judging which paths a subagent may
// write depends on how a path is spelled; refusing every write holds whatever
// the spelling. No shipped agent writes, and none needs the shell: the main
// session runs the security scan and hands its output to the security
// reviewer.
//
// In a subagent, Read is denied on `.env*`, `~/.ssh/` and `~/.aws/`; Grep and
// Glob search inside the project folder only, and never with a glob that
// could select an `.env*` file's content.
import { homedir } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";
import { contentGlobReachesSecret, isSecretPath, namesSecretGlob, namesSecretRoot } from "../agents/path-guard.js";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { parseHookEvent } from "../hooks/event.js";
import { hookLimitText, MAX_HOOK_EVENT_BYTES, readErrorCode, readStdinBounded, retryRoute, StdinTooLargeError, unreadableEvent, } from "../validate/_stdin.js";
const SUBAGENT_CONTEXT = /[\\/]subagents[\\/]agent-/;
const SUBAGENT_ALLOWED_TOOLS = new Set(["Read", "Grep", "Glob"]);
const TARGET_FIELDS = {
    Read: [["file_path", "file"]],
    Grep: [["path", "root"], ["glob", "contentGlob"]],
    Glob: [["path", "root"], ["pattern", "glob"]],
};
/**
 * True when a search rooted at `root` stays inside the session's working
 * folder. A subagent searches the project, nothing else: deciding which
 * outside folders are safe depends on how a path is spelled, while
 * containment is decided by the platform's own resolver. A network or device
 * path (two leading separators), a drive-relative one (`C:x`), `~`, and a
 * session with no working folder cannot be placed, so they are refused.
 */
function insideProject(root, cwd) {
    if (cwd === undefined || root.startsWith("~") || /^[\\/]{2}/.test(root) || /^[A-Za-z]:(?![\\/])/.test(root))
        return false;
    return within(resolve(cwd, root), resolve(cwd));
}
/** True when `inner` is `outer` or lies beneath it, by the platform's own path rules. */
function within(inner, outer) {
    const rel = relative(outer, inner);
    return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}
/**
 * Why a reading tool's call is refused, or null. A field that is not text
 * cannot be judged, so it is refused rather than read as absent.
 */
function readRefusal(tool, input, cwd) {
    // A session started in the home folder makes it the project; a search there,
    // with or without a path, would cover ~/.ssh and ~/.aws.
    if ((tool === "Grep" || tool === "Glob") && cwd !== undefined) {
        const root = typeof input["path"] === "string" ? input["path"] : ".";
        if (insideProject(root, cwd) && within(resolve(homedir()), resolve(cwd, root))) {
            return `a search over the home folder (${root}), where ~/.ssh and ~/.aws sit`;
        }
    }
    for (const [field, kind] of TARGET_FIELDS[tool] ?? []) {
        const v = input[field];
        if (v === undefined)
            continue;
        if (typeof v !== "string")
            return `its ${field} is not text`;
        if (kind === "root" && !insideProject(v, cwd))
            return `a search outside the project folder (${v}); a subagent searches the project only`;
        const judge = { file: isSecretPath, root: namesSecretRoot, glob: namesSecretGlob, contentGlob: contentGlobReachesSecret }[kind];
        const secret = judge(v);
        if (secret)
            return `a protected secret path (${v})`;
    }
    return null;
}
export async function runHookPathGuard(stdin) {
    const slug = resolveBrandSlugSync();
    const parsed = parseHookEvent(stdin);
    // An event it cannot read gives no way to tell main session from subagent,
    // so the refusal reaches every call this hook guards.
    if (!parsed.ok)
        return unreadableEvent(slug, "hook path-guard", "PreToolUse", parsed.error);
    const event = parsed.event;
    // Claude Code sends transcript_path with every event; without it the hook
    // cannot tell a subagent from the main session, which is the same blindness.
    if (event.transcript_path === undefined)
        return unreadableEvent(slug, "hook path-guard", "PreToolUse", "no transcript_path");
    if (!SUBAGENT_CONTEXT.test(event.transcript_path)) {
        return { exitCode: 0, stderr: "" };
    }
    const tool = event.tool_name;
    if (!SUBAGENT_ALLOWED_TOOLS.has(tool)) {
        return {
            exitCode: 2,
            stderr: `${slug} hook path-guard: ${tool} is not permitted in a subagent: subagents read and search only (Read, Grep, Glob). ` +
                `Make the change in the main session, where you see and approve it.\n`,
        };
    }
    const refusal = readRefusal(tool, event.tool_input, event.cwd);
    if (refusal !== null) {
        return { exitCode: 2, stderr: `${slug} hook path-guard: ${tool} denied: ${refusal}.\n` };
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
        // allow would let a subagent pad a call past this guard; on any other
        // read failure the guard simply does not know what it is judging. The
        // event is unread, so the main thread is denied too: the accepted cost of
        // a 16 MiB bound, with the route stated.
        const slug = resolveBrandSlugSync();
        io.stderr.write(err instanceof StdinTooLargeError
            ? `${slug} hook path-guard: ${hookLimitText(err)}; denied. From the main session, write the content in parts under the limit: ` +
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