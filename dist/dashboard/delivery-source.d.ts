import { type GhExec, type GhFailure } from "../github/gh.js";
import { type IssueScan } from "./handover-issues.js";
export declare const TTL_MS: number;
export declare const RETRY_MS = 60000;
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
}
export interface SourceDeps {
    readonly gh: GhExec;
    readonly repo: (ws: string) => Promise<string | null>;
    readonly now: () => Date;
}
export declare const defaultSourceDeps: SourceDeps;
/** The cached delivery data and its status; never spawns a process. */
export declare function readDelivery(ws: string, now: Date): Promise<DeliverySource>;
/** Fetches once and records the outcome in the cache: new rows, or the failure beside the old ones. */
export declare function refreshDelivery(ws: string, deps: SourceDeps): Promise<void>;
/** For one-shot commands: refresh when the cache is missing, invalid or stale, then read it. */
export declare function loadDelivery(ws: string, deps: SourceDeps): Promise<DeliverySource>;
/** For the server: at most one refresh in flight, started off the request path. */
export declare class DeliveryRefresher {
    private readonly ws;
    private readonly deps;
    private inflight;
    private lastFailedAt;
    constructor(ws: string, deps: SourceDeps);
    ensureFresh(): Promise<void>;
}
//# sourceMappingURL=delivery-source.d.ts.map