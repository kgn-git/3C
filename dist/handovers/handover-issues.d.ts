import type { GhExec, GhFailure } from "../github/gh.js";
import { type HandoverRecord, type HandoverScan } from "./handover.js";
import type { Noted } from "./handover-noted.js";
import { ISSUE_CAP, type Unreadable } from "./handover-unreadable.js";
export { ISSUE_CAP };
export type { Unreadable };
/** Every item the feed returns, whatever it is, counts toward this; room is left for pull requests among the issues. */
export declare const FEED_CAP: number;
/** Whether GitHub's author_association names an owner or a member of the owning organisation. An invited collaborator is not trusted: the label and the template are open to anyone who can open an issue. */
export declare const isTrustedAuthor: (association: string) => boolean;
export declare const CALL_MS = 30000;
export declare const DEADLINE_MS = 90000;
export interface IssueScan extends HandoverScan {
    /** Every handover issue that is not a delivery, named so the reader can act on it. */
    readonly unreadable: ReadonlyArray<Unreadable>;
    /** Handover issues from authors who are not owners or members. */
    readonly excluded: number;
    /** Records dropped because a newer handover named the same pull request. */
    readonly conflicts: number;
    /** Delivery blocks that were read although a key in them is not defined, so the author can fix them. */
    readonly noted: ReadonlyArray<Noted>;
    /** More than ISSUE_CAP handover issues exist; only the newest were read. */
    readonly capped: boolean;
}
export type IssueFetch = {
    readonly ok: true;
    readonly scan: IssueScan;
    /** Distinct logins among the owner and member items read, as a number because a login is not kept; null when any owner or member item carried no login, since the count could then be short. */
    readonly authors: number | null;
} | {
    readonly ok: false;
    readonly failure: GhFailure;
    readonly detail: string;
};
export interface IssueItem {
    readonly number: number;
    readonly body: string;
    readonly association: string;
    /** Read only to count distinct authors; it is never stored, logged or shown. */
    readonly login: string;
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
export declare function fetchHandoverItems(repo: string, gh: GhExec, deadline?: number): Promise<ItemsFetch>;
export declare function fetchHandoverIssues(repo: string, gh: GhExec, deadline?: number): Promise<IssueFetch>;
//# sourceMappingURL=handover-issues.d.ts.map