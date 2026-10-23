import { StdinTooLargeError, readErrorCode, readStdinBounded } from "../validate/_stdin.js";
/**
 * Every pipe-fed verb reads a bounded stream (CWE-400). Returns null when the
 * input is over the cap, having already reported it AND the verb's own
 * recovery route. The route is a required parameter so that no caller can
 * refuse with no way forward — a dead-end.
 */
export async function readBoundedStdin(verb, route, stream = process.stdin) {
    try {
        return await readStdinBounded(stream);
    }
    catch (err) {
        if (err instanceof StdinTooLargeError) {
            console.error(`✗ ${verb}: ${err.message}`);
            console.error(route);
        }
        else {
            // A10: a missing --file, a directory, a broken pipe. The errno code
            // only — the message carries an absolute path — and never an
            // uncaught-exception dump.
            console.error(`✗ ${verb}: cannot read input (${readErrorCode(err)})`);
            console.error("  Check that the input exists and is a readable file or pipe, then retry.");
        }
        return null;
    }
}
//# sourceMappingURL=read-input.js.map