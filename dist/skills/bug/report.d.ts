import type { IssuePayload } from "../create-issue.js";
import type { BugEnv } from "./env.js";
export interface BugInput {
    readonly summary?: string;
    readonly reproSteps?: string;
    readonly expected?: string;
    readonly actual?: string;
    readonly environment?: string;
    readonly severity?: string;
    readonly attachments?: ReadonlyArray<string>;
    readonly suspectedRootCause?: string;
}
export type BuildResult = {
    readonly ok: true;
    readonly payload: IssuePayload;
} | {
    readonly ok: false;
    readonly missing: string[];
};
export declare function buildBugReport(input: BugInput, env: BugEnv): BuildResult;
//# sourceMappingURL=report.d.ts.map