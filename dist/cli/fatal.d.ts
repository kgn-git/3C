/**
 * The event `hook run` handles: the LAST `--event=` wins, PreToolUse by
 * default. One parser for the command and for the crash classifier — two
 * parsers for one flag disagree silently.
 */
export declare function hookRunEvent(rest: readonly string[]): string;
/**
 * The exit code for a crash in `argv`'s command. A PreToolUse hook exits 2:
 * Claude Code reads any other non-zero exit as "proceed", so a crash in
 * the path-guard or the commit gate would wave the call through. Anything not
 * the advisory PostToolUse hook counts as PreToolUse.
 */
export declare function fatalExitCode(argv: readonly string[]): 1 | 2;
/**
 * Report an error nothing else handled and return the exit code. Prints one
 * line — the ref, where the detail is, the route — and nothing from the error
 * itself: its message can carry an absolute path, and its stack always does.
 */
export declare function reportFatal(err: unknown, argv: readonly string[]): 1 | 2;
/** Route a stray throw or an unhandled rejection through `reportFatal`, then exit. */
export declare function installFatalHandlers(argv: readonly string[]): void;
//# sourceMappingURL=fatal.d.ts.map