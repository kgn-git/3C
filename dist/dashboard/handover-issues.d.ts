import type { GhExec, GhFailure } from "../github/gh.js";
import { type HandoverScan } from "./handover.js";
export declare const ISSUE_CAP = 500;
export interface IssueScan extends HandoverScan {
    /** Handover issues from authors who are not owners, members or collaborators. */
    readonly excluded: number;
    /** Records dropped because a newer one claimed the same delivered issue. */
    readonly conflicts: number;
    /** More than ISSUE_CAP handover issues exist; only the newest were read. */
    readonly capped: boolean;
}
export type IssueFetch = {
    readonly ok: true;
    readonly scan: IssueScan;
} | {
    readonly ok: false;
    readonly failure: GhFailure;
    readonly detail: string;
};
export declare function fetchHandoverIssues(repo: string, gh: GhExec): Promise<IssueFetch>;
//# sourceMappingURL=handover-issues.d.ts.map