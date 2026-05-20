import type { DriftRun } from "./types.js";
export declare function appendRun(workspaceDir: string, run: DriftRun): Promise<void>;
export declare function readRuns(workspaceDir: string): Promise<ReadonlyArray<DriftRun>>;
export interface ExternalItem {
    readonly file: string;
    readonly line: number;
    readonly message: string;
}
export declare function appendExternalViolations(workspaceDir: string, ruleId: string, items: ReadonlyArray<ExternalItem>): Promise<void>;
//# sourceMappingURL=store.d.ts.map