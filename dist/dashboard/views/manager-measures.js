import { cycleMs, median } from "../delivery.js";
export const PERIOD_DAYS = 30;
export const MIN_EVENTS = 10;
/** A change smaller than this share of the earlier figure reads as about the same. */
export const MARGIN = 0.1;
const DAY_MS = 86_400_000;
/** The last 30 days ending at `now`, and the 30 days before: (now-30d, now] and (now-60d, now-30d]. Older deliveries are in neither. */
export function splitPeriods(records, now) {
    const edge = now.getTime() - PERIOD_DAYS * DAY_MS;
    const current = [];
    const previous = [];
    let undated = 0;
    let future = 0;
    for (const r of records) {
        const at = r.merged === undefined ? NaN : Date.parse(r.merged);
        if (Number.isNaN(at))
            undated++;
        else if (at > now.getTime())
            future++;
        else if (at > edge)
            current.push(r);
        else if (at > edge - PERIOD_DAYS * DAY_MS)
            previous.push(r);
    }
    return { current, previous, undated, future };
}
const DIRECTION = { repeats: "lower", blocked: "lower", cycle: "lower", fixed: "higher" };
/** Whether `later` is better, about the same or worse than `earlier`; a change under the margin is about the same. */
export function callOf(earlier, later, direction) {
    const up = earlier === 0 ? (later === 0 ? 0 : 1) : (later - earlier) / earlier;
    if (Math.abs(up) < MARGIN)
        return "same";
    return up > 0 === (direction === "higher") ? "better" : "worse";
}
const share = (part, whole) => (whole === 0 ? null : (part / whole) * 100);
function repeatsSide(records, matched) {
    return { events: records.length, value: share(records.filter((r) => matched.has(r.handover)).length, records.length), left: 0 };
}
function blockedSide(records) {
    const counted = records.flatMap((r) => (typeof r.verdict?.blocking === "number" ? [r.verdict.blocking] : []));
    return { events: counted.length, value: share(counted.filter((b) => b > 0).length, counted.length), left: records.length - counted.length };
}
function cycleSide(records) {
    const spans = records.flatMap((r) => cycleMs(r) ?? []);
    return { events: spans.length, value: median(spans), left: records.length - spans.length };
}
/** Findings fixed in the branch over findings raised; a delivery whose fixed count is missing, or above what was raised, is left out of both. */
function fixedSide(records) {
    let raised = 0;
    let fixed = 0;
    let used = 0;
    for (const r of records) {
        const v = r.verdict;
        if (v === undefined || typeof v.blocking !== "number" || typeof v.warnings !== "number" || typeof v.suggestions !== "number" || typeof v.fixed_in_branch !== "number")
            continue;
        const all = v.blocking + v.warnings + v.suggestions;
        if (v.fixed_in_branch > all)
            continue;
        raised += all;
        fixed += v.fixed_in_branch;
        used++;
    }
    return { events: raised, value: share(fixed, raised), left: records.length - used };
}
function judged(id, current, previous) {
    if (current.events < MIN_EVENTS || previous.events < MIN_EVENTS)
        return { id, kind: "few", current, previous };
    return { id, kind: "figures", current, previous, call: callOf(previous.value ?? 0, current.value ?? 0, DIRECTION[id]) };
}
/** The four measures in a fixed order; `matched` is the handovers that repeat a lesson, or null when that could not be worked out. */
export function measureAll(periods, matched) {
    const { current: c, previous: p } = periods;
    return [
        matched === null ? { id: "repeats", kind: "unmeasured" } : judged("repeats", repeatsSide(c, matched), repeatsSide(p, matched)),
        judged("blocked", blockedSide(c), blockedSide(p)),
        judged("cycle", cycleSide(c), cycleSide(p)),
        judged("fixed", fixedSide(c), fixedSide(p)),
    ];
}
//# sourceMappingURL=manager-measures.js.map