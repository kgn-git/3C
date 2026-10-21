import type { FindingsRun } from "./types.js";
export declare function appendRun(workspaceDir: string, run: FindingsRun): Promise<void>;
export declare function readRuns(workspaceDir: string): Promise<ReadonlyArray<FindingsRun>>;
export interface ExternalItem {
    readonly file: string;
    readonly line: number;
    readonly message: string;
}
export declare function appendExternalViolations(workspaceDir: string, ruleId: string, items: ReadonlyArray<ExternalItem>): Promise<void>;
//# sourceMappingURL=store.d.ts.map