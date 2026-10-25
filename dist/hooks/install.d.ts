/**
 * The path guard judges every tool a subagent calls, so it is registered on
 * all of them: a narrower matcher would leave a tool it never sees.
 */
export declare const PATH_GUARD_MATCHER = "*";
export type InstallResult = {
    readonly ok: true;
    readonly action: "installed" | "already-installed";
    readonly path: string;
} | {
    readonly ok: false;
    readonly error: string;
};
export declare function installHook(workspaceDir: string): Promise<InstallResult>;
//# sourceMappingURL=install.d.ts.map