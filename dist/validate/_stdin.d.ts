/** Aliased, not shared: each boundary keeps its own name so one can change alone. */
export declare const MAX_STDIN_BYTES = 1048576;
/**
 * Not MAX_STDIN_BYTES: a Write/Edit hook event carries the whole file body, so
 * the CLI cap would refuse writing any large file. Over it, PreToolUse hooks
 * deny (fail closed) and the advisory PostToolUse hook skips.
 */
export declare const MAX_HOOK_EVENT_BYTES: number;
export declare class StdinTooLargeError extends Error {
    readonly maxBytes: number;
    constructor(maxBytes: number);
}
/** Never the message, which carries an absolute path, nor a stack (A10). */
export declare function readErrorCode(err: unknown): string;
/** A repeating read failure denies every call, so it needs a step beyond retry. */
export declare function retryRoute(slug: string): string;
/**
 * A hook's answer to an event it cannot parse; both PreToolUse hooks use it,
 * so they refuse that event in the same words. Before a tool call it refuses:
 * a guard that steps aside when confused fails open. A hook that cannot read
 * the event cannot tell main session from subagent either, so the refusal
 * reaches every guarded call, and the route names commands typed in a
 * terminal, not ones the stalled session would have to run. After an edit the
 * check is advisory, so it only says it was skipped.
 */
export declare function unreadableEvent(slug: string, hook: string, event: "PreToolUse" | "PostToolUse", cause: string): {
    exitCode: 0 | 2;
    stderr: string;
};
/** Shared by both PreToolUse hooks so their wording cannot drift. */
export declare function hookLimitText(err: StdinTooLargeError): string;
/**
 * Fails closed above `maxBytes`, checked per chunk so the cap bounds the work,
 * not just the refusal. Buffers only: a mixed string/Buffer stream cannot
 * recover a character split across chunk kinds.
 */
export declare function readStdinBounded(stream: AsyncIterable<Buffer>, maxBytes?: number): Promise<string>;
//# sourceMappingURL=_stdin.d.ts.map