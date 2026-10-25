// Bounded stdin for every pipe-fed reader (CWE-400). Lives in the platform tier
// because src/hooks/ may not import the CLI layer; tests/cli/stdin-bounded.test.ts
// fails if a second async-iteration reader appears in src/.
import { StringDecoder } from "node:string_decoder";
import { MAX_DOC_BYTES } from "./_markdown.js";
/** Aliased, not shared: each boundary keeps its own name so one can change alone. */
export const MAX_STDIN_BYTES = MAX_DOC_BYTES;
/**
 * Not MAX_STDIN_BYTES: a Write/Edit hook event carries the whole file body, so
 * the CLI cap would refuse writing any large file. Over it, PreToolUse hooks
 * deny (fail closed) and the advisory PostToolUse hook skips.
 */
export const MAX_HOOK_EVENT_BYTES = 16 * 1_048_576;
export class StdinTooLargeError extends Error {
    maxBytes;
    constructor(maxBytes) {
        super(`input too large: stdin exceeds the ${maxBytes}-byte limit`);
        this.maxBytes = maxBytes;
        this.name = "StdinTooLargeError";
    }
}
/** Never the message, which carries an absolute path, nor a stack (A10). */
export function readErrorCode(err) {
    const code = err?.code;
    return typeof code === "string" && /^[A-Z0-9_]{1,32}$/.test(code) ? code : "read error";
}
/** A repeating read failure denies every call, so it needs a step beyond retry. */
export function retryRoute(slug) {
    return `Retry the tool call; if it repeats, run \`${slug} doctor\` and restart the session.`;
}
/**
 * A hook's answer to an event it cannot parse; both PreToolUse hooks use it,
 * so they refuse that event in the same words. Before a tool call it refuses:
 * a guard that steps aside when confused fails open. A hook that cannot read
 * the event cannot tell main session from subagent either, so the refusal
 * reaches every guarded call, and the route names commands typed in a
 * terminal, not ones the stalled session would have to run. After an edit the
 * check is advisory, so it only says it was skipped.
 */
export function unreadableEvent(slug, hook, event, cause) {
    if (event === "PostToolUse") {
        return { exitCode: 0, stderr: `${slug} ${hook}: could not read the Claude Code event (${cause}); post-edit validation skipped for this edit.\n` };
    }
    return {
        exitCode: 2,
        stderr: `${slug} ${hook}: could not read the Claude Code event (${cause}); denied. ` +
            `In a terminal, run \`${slug} hook install\`. If Claude Code was updated, install the latest ${slug.toUpperCase()} release and run \`${slug} hook install\` again. ` +
            `If it still repeats, run \`${slug} bug\`.\n`,
    };
}
/** Shared by both PreToolUse hooks so their wording cannot drift. */
export function hookLimitText(err) {
    return `event payload exceeds the ${err.maxBytes}-byte hook limit`;
}
/**
 * Fails closed above `maxBytes`, checked per chunk so the cap bounds the work,
 * not just the refusal. Buffers only: a mixed string/Buffer stream cannot
 * recover a character split across chunk kinds.
 */
export async function readStdinBounded(stream, maxBytes = MAX_STDIN_BYTES) {
    const decoder = new StringDecoder("utf8");
    const parts = [];
    let bytes = 0;
    for await (const chunk of stream) {
        // Bytes, not UTF-16 code units, which under-count non-ASCII input.
        bytes += chunk.length;
        if (bytes > maxBytes)
            throw new StdinTooLargeError(maxBytes);
        parts.push(decoder.write(chunk));
    }
    parts.push(decoder.end());
    return parts.join("");
}
//# sourceMappingURL=_stdin.js.map