/**
 * The cap for the CLI's pipe-fed verbs: an ALIAS of #317's document cap, the
 * convention declared once. Aliased, not shared — each boundary keeps its own
 * name so one can change without silently moving another.
 */
export declare const MAX_STDIN_BYTES = 1048576;
/**
 * The cap for a Claude Code hook event on stdin (#416). Its own value, not the
 * CLI's: a PreToolUse/PostToolUse event for Write or Edit carries the WHOLE
 * file body, so 1 MiB would refuse every main-thread write of a file over
 * 1 MiB. 16 MiB still bounds the read; an event over it is denied by the
 * PreToolUse hooks (fail closed) and skipped by the advisory PostToolUse one.
 * Do not collapse this into MAX_STDIN_BYTES.
 */
export declare const MAX_HOOK_EVENT_BYTES: number;
export declare class StdinTooLargeError extends Error {
    readonly maxBytes: number;
    constructor(maxBytes: number);
}
/**
 * A read failure's errno code (`ENOENT`, `EIO`, …) or a generic word — never
 * the message, which carries an absolute path, and never a stack (A10).
 */
export declare function readErrorCode(err: unknown): string;
/**
 * The route after a hook could not read its event. A one-off read failure
 * clears on retry; one that repeats denies every call, so it needs a step
 * that is not "retry" again.
 */
export declare function retryRoute(slug: string): string;
/** The refusal wording both PreToolUse hooks share, so the two cannot drift. */
export declare function hookLimitText(err: StdinTooLargeError): string;
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
export declare function readStdinBounded(stream: AsyncIterable<Buffer>, maxBytes?: number): Promise<string>;
//# sourceMappingURL=_stdin.d.ts.map