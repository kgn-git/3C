// #448 board: installs the fatal handlers BEFORE the rest of the CLI loads.
//
// `src/cli.ts` imports this module first. ESM evaluates imports in order, so
// the handlers are live before cli.ts's OTHER modules run — a throw while the
// CLI is still loading reaches `reportFatal`, not Node's printer. Installing
// them in cli.ts's own body came too late for that. Not before EVERY module:
// fatal.ts's own imports (branding/runtime, validate/secrets) load first, so
// keep their top level free of anything that can throw.
//
// Only when the CLI is the process entry point: tests import cli.ts, and a
// process-wide `uncaughtException` listener in a test worker would swallow
// the runner's own failures.
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { installFatalHandlers } from "./fatal.js";
const entry = new URL("../cli.js", import.meta.url).href;
let invoked = process.argv[1];
if (invoked !== undefined) {
    try {
        invoked = realpathSync(invoked);
    }
    catch {
        /* compare the raw path */
    }
    if (pathToFileURL(invoked).href === entry)
        installFatalHandlers(process.argv.slice(2));
}
//# sourceMappingURL=fatal-boot.js.map