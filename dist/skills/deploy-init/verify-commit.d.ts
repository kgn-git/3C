export interface GitRunResult {
    readonly code: number;
    readonly stdout: string;
    readonly stderr: string;
}
export interface GitRunOptions {
    readonly cwd: string;
}
export type GitRunner = (args: readonly string[], opts: GitRunOptions) => Promise<GitRunResult>;
export interface VerifyOptions {
    readonly ref: string;
    readonly repoDir: string;
    readonly runGit: GitRunner;
}
export interface VerifyResult {
    readonly verified: boolean;
    readonly signer?: string;
    readonly error?: string;
}
export declare function verifyUpstream(opts: VerifyOptions): Promise<VerifyResult>;
//# sourceMappingURL=verify-commit.d.ts.map