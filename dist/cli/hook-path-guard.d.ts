export interface HookPathGuardResult {
    readonly exitCode: 0 | 2;
    readonly stderr: string;
}
export declare function runHookPathGuard(stdin: string): Promise<HookPathGuardResult>;
export declare function hookPathGuardCli(): Promise<number>;
//# sourceMappingURL=hook-path-guard.d.ts.map