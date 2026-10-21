// #408 AC11 (CWE-400): bounded stdin for every pipe-fed reader.
//
// #416: moved here from src/cli/ — the platform tier — because its most
// natural consumer, the hook event reader in src/hooks/, may not import the
// CLI layer. It is the ONLY async-iteration loop in src/; a corpus test
// (tests/cli/stdin-bounded.test.ts) fails if a second reader appears.
//
// `test write` accumulated the whole stream into a string and only then handed
// it on, so the cost of a `3c test write` invocation was set by whatever was on
// the other end of the pipe. #317 established the fail-closed size-cap
// convention for documents (`MAX_DOC_BYTES` in src/validate/_markdown.ts); the
// stdin readers were written before it and never picked it up.
//
// The check runs PER CHUNK, not on the finished buffer. Checking after reading
// to EOF still materialises the whole input first, which is the exact cost the
// cap exists to bound — the bound would describe the refusal, not the work.
import { StringDecoder } from "node:string_decoder";
import { MAX_DOC_BYTES } from "./_markdown.js";
/**
 * The cap for the CLI's pipe-fed verbs: an ALIAS of #317's document cap, the
 * convention declared once. Aliased, not shared — each boundary keeps its own
 * name so one can change without silently moving another.
 */
export const MAX_STDIN_BYTES = MAX_DOC_BYTES;
/**
 * The cap for a Claude Code hook event on stdin (#416). Its own value, not the
 * CLI's: a PreToolUse/PostToolUse event for Write or Edit carries the WHOLE
 * file body, so 1 MiB would refuse every main-thread write of a file over
 * 1 MiB. 16 MiB still bounds the read; an event over it is denied by the
 * PreToolUse hooks (fail closed) and skipped by the advisory PostToolUse one.
 * Do not collapse this into MAX_STDIN_BYTES.
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
/**
 * A read failure's errno code (`ENOENT`, `EIO`, …) or a generic word — never
 * the message, which carries an absolute path, and never a stack (A10).
 */
export function readErrorCode(err) {
    const code = err?.code;
    return typeof code === "string" && /^[A-Z0-9_]{1,32}$/.test(code) ? code : "read error";
}
/**
 * The route after a hook could not read its event. A one-off read failure
 * clears on retry; one that repeats denies every call, so it needs a step
 * that is not "retry" again.
 */
export function retryRoute(slug) {
    return `Retry the tool call; if it repeats, run \`${slug} doctor\` and restart the session.`;
}
/** The refusal wording both PreToolUse hooks share, so the two cannot drift. */
export function hookLimitText(err) {
    return `event payload exceeds the ${err.maxBytes}-byte hook limit`;
}
/**
 * Reads `stream` to a string, failing closed above `maxBytes`. Multi-byte
 * characters split across chunk boundaries are decoded correctly rather than
 * per-chunk.
 *
 * Buffers ONLY, deliberately. The first version accepted `string | Buffer` and
 * claimed to handle a mixed stream, which is not a coherent thing to handle: a
 * text chunk cannot carry the second byte of a character the previous Buffer
 * chunk split, so no implementation recovers it — the old code reordered the
 * output and the "fix" replaced both bytes with U+FFFD. Every call site passes
 * `process.stdin` or a file read stream, neither given an encoding, so both
 * always yield Buffers and the string branch had no production caller. Deleting
 * it removes an untestable branch instead of decorating one with a test.
 */
export async function readStdinBounded(stream, maxBytes = MAX_STDIN_BYTES) {
    const decoder = new StringDecoder("utf8");
    const parts = [];
    let bytes = 0;
    for await (const chunk of stream) {
        // Byte length is measured on the wire form. A string's `.length` counts
        // UTF-16 code units, which under-counts every non-ASCII character and would
        // have let a body through at roughly twice the cap.
        bytes += chunk.length;
        if (bytes > maxBytes)
            throw new StdinTooLargeError(maxBytes);
        parts.push(decoder.write(chunk));
    }
    parts.push(decoder.end());
    return parts.join("");
}
//# sourceMappingURL=_stdin.js.map