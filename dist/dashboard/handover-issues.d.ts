import type { GhExec, GhFailure } from "../github/gh.js";
import { type HandoverScan } from "./handover.js";
import { ISSUE_CAP, type Unreadable } from "./handover-unreadable.js";
export { ISSUE_CAP };
export type { Unreadable };
export interface IssueScan extends HandoverScan {
    /** Every handover issue that is not a delivery, named so the reader can act on it. */
    readonly unreadable: ReadonlyArray<Unreadable>;
    /** Handover issues from authors who are not owners, members or collaborators. */
    readonly excluded: number;
    /** Records dropped because a newer handover named the same pull request. */
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