import type { Severity } from "./severity.js";
export interface Finding {
    readonly id: string;
    readonly severity: Severity;
    readonly ruleId: string;
    readonly file: string;
    readonly line: number;
    readonly detail: string;
}
export interface ScanInput {
    readonly workspaceDir: string;
    readonly changedFiles: ReadonlyArray<string>;
}
export interface Scanner {
    scan(input: ScanInput): Promise<Finding[]>;
}
export declare function findingId(ruleId: string, file: string, line: number): string;
//# sourceMappingURL=findings.d.ts.map