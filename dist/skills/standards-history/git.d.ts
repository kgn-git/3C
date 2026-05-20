export declare const STANDARDS_PATHS: ReadonlyArray<string>;
export interface GitResult {
    readonly ok: boolean;
    readonly stdout: string;
    readonly error?: string;
}
export declare function runGit(ws: string, args: ReadonlyArray<string>): Promise<GitResult>;
//# sourceMappingURL=git.d.ts.map