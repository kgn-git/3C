export interface WriteTestOptions {
    readonly targetPath: string;
    readonly content: string;
    readonly workspaceDir: string;
}
export interface WriteTestSuccess {
    readonly ok: true;
    readonly written: string;
}
export interface WriteTestFailure {
    readonly ok: false;
    readonly error: string;
    readonly secretHits?: ReadonlyArray<{
        readonly line: number;
        readonly type: string;
        readonly redacted: string;
    }>;
}
export type WriteTestResult = WriteTestSuccess | WriteTestFailure;
export declare function writeTest(opts: WriteTestOptions): Promise<WriteTestResult>;
//# sourceMappingURL=write.d.ts.map