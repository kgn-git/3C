import type { SpawnFn } from "../../skills/create-issue.js";
export interface FileHandoverEnv {
    readonly spawn: SpawnFn;
    /** Brings the memory up to date for the handover just filed; returns the sync's exit status. */
    readonly sync?: (log: (msg: string) => void, error: (msg: string) => void, filed: number) => Promise<number>;
    readonly log: (msg: string) => void;
    readonly error: (msg: string) => void;
}
/**
 * Files a handover, then brings the memory up to date so the next brief can read it. The sync runs here, in the
 * composition root, and not inside the filer, so a failed sync can never change what filing reports.
 */
export declare function fileHandoverCommand(body: string, env: FileHandoverEnv): Promise<number>;
//# sourceMappingURL=file-handover.d.ts.map