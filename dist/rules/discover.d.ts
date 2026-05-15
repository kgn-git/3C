export type DiscoverResult = {
    readonly ok: true;
    readonly files: ReadonlyArray<string>;
} | {
    readonly ok: false;
    readonly error: string;
};
export declare function discoverWorkspaceFiles(workspaceDir: string): Promise<DiscoverResult>;
//# sourceMappingURL=discover.d.ts.map