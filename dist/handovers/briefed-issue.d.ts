import type { GhExec, GhFailure } from "../github/gh.js";
export interface LiveIssue {
    readonly number: number;
    readonly title: string;
    readonly body: string;
    readonly state: "open" | "closed";
    readonly author_association: string;
    readonly updated_at: string;
}
export type IssueRead = {
    readonly ok: true;
    readonly issue: LiveIssue;
} | {
    readonly ok: false;
    readonly failure: GhFailure | "too-large";
    readonly detail: string;
};
/** The issue, or the named reason it could not be read. `number` is checked here, since it reaches the command line. */
export declare function fetchIssue(repo: string, number: number, gh: GhExec): Promise<IssueRead>;
//# sourceMappingURL=briefed-issue.d.ts.map