import type { GhExec, GhFailure } from "../github/gh.js";
import { type HandoverRecord, type HandoverScan } from "./handover.js";
import { ISSUE_CAP, type Unreadable } from "./handover-unreadable.js";
export { ISSUE_CAP };
export type { Unreadable };
/** Whether GitHub's author_association names an owner, an organisation member or an invited collaborator. */
export declare const isTrustedAuthor: (association: string) => boolean;
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
export interface IssueItem {
    readonly number: number;
    readonly body: string;
    readonly association: string;
    readonly isPull: boolean;
}
export declare const newestFirst: (a: HandoverRecord, b: HandoverRecord) => number;
export type ItemsFetch = {
    readonly ok: true;
    readonly issues: ReadonlyArray<IssueItem>;
    readonly bad: number;
} | {
    readonly ok: false;
    readonly failure: GhFailure;
    readonly detail: string;
};
/** Whole pages of handover issues until the count passes the cap, pull requests removed; the scan and the memory read the same pages. */
export declare function fetchHandoverItems(repo: string, gh: GhExec): Promise<ItemsFetch>;
export declare function fetchHandoverIssues(repo: string, gh: GhExec): Promise<IssueFetch>;
//# sourceMappingURL=handover-issues.d.ts.map