import { resolveBrandSlugSync } from "../branding/runtime.js";
import { createBackup } from "../install/backup.js";
// The backup every step of one `setup --replace` run shares; unset
// outside setup, where each command takes its own.
export let sharedBackup;
/** An imported binding is read-only, so `setup` sets the shared backup through here. */
export function setSharedBackup(backup) {
    sharedBackup = backup;
}
/** The backup for this replace: setup's shared one, or a fresh one for a standalone command. */
export function currentBackup() {
    return sharedBackup ?? createBackup(process.cwd(), resolveBrandSlugSync());
}
/** Say where a standalone replace put its backup; setup reports once, at the end. */
export function reportBackup(backup) {
    if (backup && backup !== sharedBackup && backup.saved > 0) {
        console.log(`↩ backed up ${backup.saved} file(s) to ${backup.dir} before replacing them — copy them back to undo.`);
    }
}
//# sourceMappingURL=backup-scope.js.map