export interface SetupStep {
    readonly name: string;
    readonly run: () => Promise<number>;
}
export interface SetupOutcome {
    readonly completed: ReadonlyArray<string>;
    readonly total: number;
    readonly failedAt?: {
        readonly step: string;
        readonly code: number;
    };
}
export declare function runSetup(steps: ReadonlyArray<SetupStep>, log?: (msg: string) => void): Promise<SetupOutcome>;
//# sourceMappingURL=setup.d.ts.map