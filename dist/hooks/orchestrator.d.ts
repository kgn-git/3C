export interface SpawnResult {
    readonly exitCode: number;
    readonly stderr: string;
    readonly durationMs: number;
}
export type SpawnFn = (executable: string, args: ReadonlyArray<string>, opts: {
    readonly signal: AbortSignal;
    readonly timeoutMs: number;
}) => Promise<SpawnResult>;
export interface OrchestratorOptions {
    readonly workspaceDir: string;
    readonly event: string;
    readonly stdin: NodeJS.ReadableStream;
    readonly stderr: NodeJS.WritableStream;
    readonly user: string;
    readonly spawn?: SpawnFn;
    readonly prompter: (diff: string) => Promise<boolean>;
}
export interface OrchestratorResult {
    readonly exitCode: 0 | 2;
}
export declare function runHookOrchestrator(opts: OrchestratorOptions): Promise<OrchestratorResult>;
//# sourceMappingURL=orchestrator.d.ts.map