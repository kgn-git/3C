// Imported first by `src/cli.ts`, so ESM order arms the fatal handlers before
// its other modules evaluate. fatal.ts's own imports load earlier still: keep
// their top level throw-free. Entry-point only: in a test worker a global
// `uncaughtException` listener would swallow the runner's failures.
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