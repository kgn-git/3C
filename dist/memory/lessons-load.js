import { ISSUE_CAP } from "../handovers/handover-unreadable.js";
/** Handover number to its `merged` time, for every handover the delivery cache holds a time for. */
export function mergeDates(source) {
    return new Map(source.scan.records.flatMap((r) => (r.merged === undefined ? [] : [[r.handover, r.merged]])));
}
/**
 * Why the merge dates may be wrong or missing, or null when the cache is fresh and holds every handover. The lessons
 * command refreshes a stale cache before it reads, so for it a cache that is still not fresh is one whose fetch failed;
 * the served app only reads, so for it a cache can also be older than its refresh time.
 */
export function dateCaveat(src) {
    const why = [];
    if (src.status.kind === "failed")
        why.push("the last fetch from GitHub failed, so the dates may be old");
    else if (src.status.kind === "expired")
        why.push("the delivery cache is older than its refresh time");
    else if (src.status.kind !== "fresh")
        why.push("the delivery cache could not be refreshed");
    if (src.scan.capped)
        why.push(`handovers older than the newest ${ISSUE_CAP} have no merge date`);
    return why.length === 0 ? null : why.join("; ");
}
//# sourceMappingURL=lessons-load.js.map