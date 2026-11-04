import type { LiveIssue } from "../handovers/briefed-issue.js";
import { type Ranked } from "./brief-rank.js";
import type { Store } from "./store.js";
export type { LiveIssue };
export type Verdict = "closed" | "named" | "files-moved" | "unchanged" | "unknown";
/** What git can say about the default branch; null means the question could not be answered. */
export interface GitProbe {
    /** The branch the other answers are about: the remote's when there is one, else the local one. */
    ref(): Promise<string | null>;
    named(issue: number, since: string): Promise<string[] | null>;
    touched(files: ReadonlyArray<string>, since: string): Promise<string[] | null>;
}
export interface BriefInput {
    readonly issue: number;
    readonly store: Store;
    /** The issue read just now, or null when it could not be read. */
    readonly live: LiveIssue | null;
    /** In words, why the issue could not be read; shown when `live` is null. */
    readonly unreadCause?: string | null;
    readonly git: GitProbe;
}
/** A ranked note and the labels it is printed with; none when the brief was built without them. */
export type BriefNote = Pick<Ranked, "note" | "why"> & {
    readonly labels?: ReadonlyArray<string>;
};
export interface Brief {
    readonly issue: number;
    readonly title: string | null;
    /** Whose words the issue's own text is: a trusted author's, someone else's, or not read at all. */
    readonly source: "trusted" | "untrusted" | "unread";
    readonly unreadCause: string | null;
    readonly verdict: Verdict;
    readonly evidence: ReadonlyArray<string>;
    /** Where the evidence lines come from: GitHub, or the branch the git log was read on. */
    readonly evidenceFrom: "GitHub" | "git";
    /** The branch git was asked about, or null when there is none. */
    readonly ref: string | null;
    /** The date the check runs from, and whether it is the ruling's own date or the issue's last update. */
    readonly since: string | null;
    readonly sinceFrom: "ruling" | "update" | null;
    readonly decided: ReadonlyArray<string>;
    readonly criteria: ReadonlyArray<string>;
    readonly touch: ReadonlyArray<string>;
    readonly notes: ReadonlyArray<BriefNote>;
    readonly syncedAt: string;
}
export declare function buildBrief(input: BriefInput): Promise<Brief>;
//# sourceMappingURL=brief.d.ts.map