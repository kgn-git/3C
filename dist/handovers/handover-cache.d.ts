import { type GhFailure } from "../github/failures.js";
import type { IssueScan } from "./handover-issues.js";
import { type IssueFlag } from "./issue-flags.js";
export declare const CACHE_VERSION = 6;
/** The open or closed state of the issues the handovers name, with when the refresh that read them began and how many numbers were left unread. */
export interface FlagState {
    readonly at: string;
    readonly cut: number;
    readonly list: ReadonlyArray<IssueFlag>;
}
export interface DeliveryCache {
    /** `owner/repo`, or null when the workspace has no github.com origin. */
    readonly repo: string | null;
    /** When the cached rows were fetched; null when no fetch has succeeded yet. */
    readonly fetchedAt: string | null;
    /** The most recent fetch's failure, kept beside the older rows it could not replace. */
    readonly failure: {
        readonly state: GhFailure;
        readonly at: string;
    } | null;
    readonly scan: IssueScan;
    /** Null until a read of the flags has succeeded: not measured, which is not the same as none. */
    readonly flags: FlagState | null;
    /** Distinct authors among the owner and member issues in the read window; null until measured. No login is kept. */
    readonly authors: number | null;
}
export type CacheRead = {
    kind: "absent";
} | {
    kind: "invalid";
}
/** Written by an earlier release; expected after an upgrade, so not reported as damage. */
 | {
    kind: "outdated";
} | {
    kind: "found";
    cache: DeliveryCache;
};
export declare const cachePath: (ws: string) => string;
export declare function writeCache(ws: string, cache: DeliveryCache): Promise<void>;
export declare function readCache(ws: string): Promise<CacheRead>;
//# sourceMappingURL=handover-cache.d.ts.map