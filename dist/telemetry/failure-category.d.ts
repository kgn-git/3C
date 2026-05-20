import type { FailureCategory } from "./record.js";
export interface Outcome {
    readonly exitCode: number;
    readonly timedOut: boolean;
    readonly configError: boolean;
    readonly spawnError: boolean;
}
export declare function deriveFailureCategory(o: Outcome): FailureCategory;
//# sourceMappingURL=failure-category.d.ts.map