import { type SpawnFn, type IssueRef, type PreflightWarning } from "../create-issue.js";
import { type BugInput } from "./report.js";
export interface RunBugOptions {
    readonly spawn?: SpawnFn;
    readonly gitRunner?: () => Promise<string>;
}
export interface RunBugResult {
    readonly filed: boolean;
    readonly ref?: IssueRef;
    readonly missing?: string[];
    readonly warnings?: ReadonlyArray<PreflightWarning>;
}
export declare function runBugReport(input: BugInput, workspaceDir: string, opts?: RunBugOptions): Promise<RunBugResult>;
//# sourceMappingURL=index.d.ts.map