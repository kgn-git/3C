export interface BugEnv {
    readonly os: string;
    readonly appVersion: string;
    readonly commitSha: string;
}
export interface CaptureEnvOptions {
    readonly gitRunner?: () => Promise<string>;
    readonly packageRoot?: string;
}
export declare function captureEnv(opts?: CaptureEnvOptions): Promise<BugEnv>;
//# sourceMappingURL=env.d.ts.map