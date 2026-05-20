export interface ScopedClaudeMd {
    readonly root: string;
    readonly dir: string | null;
    readonly merged: string;
}
export declare function loadScopedClaudeMd(workspaceDir: string, filePath: string): Promise<ScopedClaudeMd>;
//# sourceMappingURL=claudemd.d.ts.map