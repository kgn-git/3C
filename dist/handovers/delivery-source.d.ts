import { type GhExec, type GhFailure } from "../github/gh.js";
import { type FlagState } from "./handover-cache.js";
import { type IssueScan } from "./handover-issues.js";
export declare const TTL_MS: number;
export type DeliveryStatus = {
    readonly kind: "fresh";
    readonly fetchedAt: string;
}
/** Older than the TTL; the next refresh replaces it. */
 | {
    readonly kind: "expired";
    readonly fetchedAt: string;
}
/** The cache file failed validation and was not used. */
 | {
    readonly kind: "discarded";
}
/** The cache was written by an earlier release and is fetched again. */
 | {
    readonly kind: "outdated";
} | {
    readonly kind: "failed";
    readonly state: GhFailure | "never-fetched";
    readonly at: string | null;
    /** When the rows still shown were fetched; null when there are none. */
    readonly fetchedAt: string | null;
};
export interface DeliverySource {
    readonly repo: string | null;
    readonly scan: IssueScan;
    readonly status: DeliveryStatus;
    /** Null when never read, whatever the status: a figure built on it says "not measured yet", never zero. */
    readonly flags: FlagState | null;
    /** Distinct authors among the owner and member issues in the read window; null when never measured. */
    readonly authors: number | null;
}
export interface SourceDeps {
    readonly gh: GhExec;
    readonly repo: (ws: string) => Promise<string | null>;
    readonly now: () => Date;
    /** Issue numbers the memory wants the state of, supplied by the layer that holds the memory; this module imports none of it. */
    readonly extraIssues?: (ws: string) => Promise<ReadonlyArray<number>>;
}
export declare const defaultSourceDeps: SourceDeps;
/** The cached delivery data and its status; never spawns a process. */
export declare function readDelivery(ws: string, now: Date): Promise<DeliverySource>;
/** Reads the handover list once, then the state of the issues it names, and records the outcome in the cache: new rows, or the failure beside the old ones. */
export declare function refreshDelivery(ws: string, deps: SourceDeps): Promise<void>;
export declare const needsRefresh: (s: DeliverySource) => boolean;
/** For one-shot commands: refresh when the cache is missing, invalid or stale, then read it. */
export declare function loadDelivery(ws: string, deps: SourceDeps): Promise<DeliverySource>;
//# sourceMappingURL=delivery-source.d.ts.map