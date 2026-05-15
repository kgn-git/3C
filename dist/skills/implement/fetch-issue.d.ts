import type { SpawnFn } from "../create-issue.js";
export interface FetchedIssue {
    readonly number: number;
    readonly title: string;
    readonly body: string;
    readonly labels: ReadonlyArray<string>;
    readonly url: string;
}
export interface FetchIssueOptions {
    readonly spawn?: SpawnFn;
    readonly repo?: string;
}
export type FetchIssueResult = {
    readonly ok: true;
    readonly issue: FetchedIssue;
} | {
    readonly ok: false;
    readonly error: string;
};
export declare function fetchIssue(id: number | string, options?: FetchIssueOptions): Promise<FetchIssueResult>;
//# sourceMappingURL=fetch-issue.d.ts.map