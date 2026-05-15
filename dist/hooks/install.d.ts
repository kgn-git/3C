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