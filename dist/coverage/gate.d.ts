import type { CoverageConfig } from "./thresholds.js";
import type { FileChange } from "./diff.js";
export interface GateInput {
    readonly coverage: ReadonlyMap<string, ReadonlySet<number>>;
    readonly changes: ReadonlyArray<FileChange>;
    readonly config: CoverageConfig;
}
export interface GateResult {
    readonly blocked: boolean;
    readonly coveragePct: number;
    readonly uncovered: ReadonlyArray<{
        file: string;
        line: number;
    }>;
    readonly message: string;
}
export declare function evaluateCoverageGate(input: GateInput): GateResult;
//# sourceMappingURL=gate.d.ts.map