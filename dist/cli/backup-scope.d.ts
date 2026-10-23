import { type Backup } from "../install/backup.js";
export declare let sharedBackup: Backup | undefined;
/** An imported binding is read-only, so `setup` sets the shared backup through here. */
export declare function setSharedBackup(backup: Backup | undefined): void;
/** The backup for this replace: setup's shared one, or a fresh one for a standalone command. */
export declare function currentBackup(): Backup;
/** Say where a standalone replace put its backup; setup reports once, at the end. */
export declare function reportBackup(backup: Backup | undefined): void;
//# sourceMappingURL=backup-scope.d.ts.map