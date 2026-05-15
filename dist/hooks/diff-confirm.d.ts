export interface DiffConfirmOptions {
    readonly workspaceDir: string;
    readonly currentContent: string;
    readonly user: string;
    readonly prompter: (diff: string) => Promise<boolean>;
}
export interface DiffConfirmResult {
    readonly action: "no-change" | "confirmed" | "rejected";
}
export declare function hashContent(content: string): string;
export declare function checkAndConfirmHooksConfig(opts: DiffConfirmOptions): Promise<DiffConfirmResult>;
//# sourceMappingURL=diff-confirm.d.ts.map