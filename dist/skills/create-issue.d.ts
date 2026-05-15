export interface IssuePayload {
    readonly title: string;
    readonly body: string;
    readonly labels?: ReadonlyArray<string>;
    readonly assignees?: ReadonlyArray<string>;
    readonly repo?: string;
}
export interface IssueRef {
    readonly url: string;
    readonly number: number;
}
export interface PreflightWarning {
    readonly type: "secret" | "large-code-block";
    readonly line?: number;
    readonly message: string;
}
export type SpawnFn = (executable: string, args: ReadonlyArray<string>) => Promise<{
    readonly exitCode: number;
    readonly stdout: string;
    readonly stderr: string;
}>;
export interface CreateIssueOptions {
    readonly force?: boolean;
    readonly spawn?: SpawnFn;
}
export type CreateIssueResult = {
    readonly ok: true;
    readonly ref: IssueRef;
    readonly warnings: ReadonlyArray<PreflightWarning>;
} | {
    readonly ok: false;
    readonly warnings: ReadonlyArray<PreflightWarning>;
    readonly error?: string;
};
export declare function preflight(body: string): PreflightWarning[];
export declare function createIssue(payload: IssuePayload, options?: CreateIssueOptions): Promise<CreateIssueResult>;
//# sourceMappingURL=create-issue.d.ts.map