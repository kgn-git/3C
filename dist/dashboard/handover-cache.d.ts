import type { GhFailure } from "../github/gh.js";
import type { IssueScan } from "./handover-issues.js";
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
}
export type CacheRead = {
    kind: "absent";
} | {
    kind: "invalid";
} | {
    kind: "found";
    cache: DeliveryCache;
};
export declare const cachePath: (ws: string) => string;
export declare function writeCache(ws: string, cache: DeliveryCache): Promise<void>;
export declare function readCache(ws: string): Promise<CacheRead>;
//# sourceMappingURL=handover-cache.d.ts.map