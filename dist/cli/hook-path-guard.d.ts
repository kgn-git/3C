export interface HookPathGuardResult {
    readonly exitCode: 0 | 2;
    readonly stderr: string;
}
export declare function runHookPathGuard(stdin: string): Promise<HookPathGuardResult>;
export interface HookPathGuardIo {
    readonly stdin: AsyncIterable<Buffer>;
    readonly stderr: {
        write(text: string): unknown;
    };
}
export declare function hookPathGuardCli(io?: HookPathGuardIo): Promise<number>;
//# sourceMappingURL=hook-path-guard.d.ts.map