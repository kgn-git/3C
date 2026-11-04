import type { DeliverySource } from "../handovers/delivery-source.js";
/** Handover number to its `merged` time, for every handover the delivery cache holds a time for. */
export declare function mergeDates(source: DeliverySource): Map<number, string>;
/**
 * Why the merge dates may be wrong or missing, or null when the cache is fresh and holds every handover. The lessons
 * command refreshes a stale cache before it reads, so for it a cache that is still not fresh is one whose fetch failed;
 * the served app only reads, so for it a cache can also be older than its refresh time.
 */
export declare function dateCaveat(src: DeliverySource): string | null;
//# sourceMappingURL=lessons-load.d.ts.map