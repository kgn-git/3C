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
export declare const cacheDir: (ws: string) => string;
export declare const cachePath: (ws: string) => string;
/**
 * Writes `name` in the cache directory through a fresh temporary file renamed
 * into place: a rename replaces a planted link rather than writing through
 * it (CWE-59), and a cache directory that is itself a link is refused.
 */
export declare function writeCacheFile(ws: string, name: string, text: string): Promise<void>;
export declare function writeCache(ws: string, cache: DeliveryCache): Promise<void>;
export declare function readCache(ws: string): Promise<CacheRead>;
//# sourceMappingURL=handover-cache.d.ts.map