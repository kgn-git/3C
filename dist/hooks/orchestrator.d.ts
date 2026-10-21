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
    /** Buffers only, like `process.stdin` (#416: read through the bounded reader). */
    readonly stdin: AsyncIterable<Buffer>;
    /**
     * #384: the channel the MODEL reads. At exit 0 stderr goes to the debug log
     * only, so the post-edit advisory reached neither the agent nor the user —
     * a capability that fired and informed nobody. Claude Code parses stdout for
     * a JSON envelope, and `hookSpecificOutput.additionalContext` is the field
     * shown to the model without rendering as an error.
     *
     * Required, not optional: a call site that forgot to supply it would lose
     * the model channel silently, which is the exact failure this issue closes.
     */
    readonly stdout: NodeJS.WritableStream;
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