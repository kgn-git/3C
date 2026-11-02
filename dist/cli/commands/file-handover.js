import { fileHandover } from "../../skills/implement/file-handover.js";
import { memoryCommand, SYNC_STOPPED } from "./memory.js";
const realSync = (log, error, filed) => memoryCommand(["sync"], { cwd: process.cwd(), filed, log, error });
/**
 * Files a handover, then brings the memory up to date so the next brief can read it. The sync runs here, in the
 * composition root, and not inside the filer, so a failed sync can never change what filing reports.
 */
export async function fileHandoverCommand(body, env) {
    const r = await fileHandover(body, env.spawn);
    if (!r.ok) {
        env.error(`\n✗ ${r.message}`);
        if (r.manual.length > 0) {
            env.error("  Finish by hand (save the body as handover.md first):");
            for (const m of r.manual)
                env.error(`    ${m}`);
        }
        return 1;
    }
    env.log(`\n✓ ${r.url}`);
    env.log(r.created ? `  Handover #${r.number} filed and closed` : `  Handover #${r.number} was already filed — nothing created`);
    // Failure lines wait, so they print under the notice that the handover is filed and only the memory update failed.
    const failure = [];
    let status;
    try {
        status = await (env.sync ?? realSync)(env.log, (m) => failure.push(m), r.number);
    }
    catch {
        status = 1;
        failure.push(SYNC_STOPPED, "Next step: run 3c memory sync again. If it fails again, report it with `3c bug`.");
    }
    if (status !== 0) {
        env.error("The handover is filed; only the memory update failed.");
        for (const line of failure)
            env.error(line);
    }
    return 0;
}
//# sourceMappingURL=file-handover.js.map