import type { GhExec, GhFailure } from "../github/gh.js";
export declare const FLAG_CAP = 300;
export declare const FLAG_BATCH = 10;
/** `open` is null for a number GitHub does not answer for as an issue: it is unknown, which is not the same as closed. */
export interface IssueFlag {
    readonly issue: number;
    readonly open: boolean | null;
}
export type FlagsFetch = {
    readonly ok: true;
    readonly flags: ReadonlyArray<IssueFlag>; /** Distinct numbers past the cap, which were not read. */
    readonly cut: number;
} | {
    readonly ok: false;
    readonly failure: GhFailure;
    readonly detail: string;
};
/** The flag of each distinct valid number in the order given, up to FLAG_CAP; one failed call fails the whole read. */
export declare function fetchIssueFlags(repo: string, numbers: ReadonlyArray<number>, gh: GhExec, deadline?: number): Promise<FlagsFetch>;
//# sourceMappingURL=issue-flags.d.ts.map