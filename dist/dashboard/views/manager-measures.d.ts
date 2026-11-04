import type { HandoverRecord } from "../../handovers/handover.js";
export declare const PERIOD_DAYS = 30;
export declare const MIN_EVENTS = 10;
/** A change smaller than this share of the earlier figure reads as about the same. */
export declare const MARGIN = 0.1;
export interface Periods {
    readonly current: ReadonlyArray<HandoverRecord>;
    readonly previous: ReadonlyArray<HandoverRecord>;
    /** Deliveries with no merge time, or one that cannot be read. */
    readonly undated: number;
    /** Deliveries merged after the build time, which a clock set back can produce. */
    readonly future: number;
}
/** The last 30 days ending at `now`, and the 30 days before: (now-30d, now] and (now-60d, now-30d]. Older deliveries are in neither. */
export declare function splitPeriods(records: ReadonlyArray<HandoverRecord>, now: Date): Periods;
export type MeasureId = "repeats" | "blocked" | "cycle" | "fixed";
export type Call = "better" | "same" | "worse";
type Direction = "lower" | "higher";
/** `events` is how many of the measure's own kind of event the period holds; `left` is the deliveries that had no figure for it. */
export interface Side {
    readonly events: number;
    readonly value: number | null;
    readonly left: number;
}
export type Measured = {
    readonly id: MeasureId;
    readonly kind: "unmeasured";
} | {
    readonly id: MeasureId;
    readonly kind: "few";
    readonly current: Side;
    readonly previous: Side;
} | {
    readonly id: MeasureId;
    readonly kind: "figures";
    readonly current: Side;
    readonly previous: Side;
    readonly call: Call;
};
/** Whether `later` is better, about the same or worse than `earlier`; a change under the margin is about the same. */
export declare function callOf(earlier: number, later: number, direction: Direction): Call;
/** The four measures in a fixed order; `matched` is the handovers that repeat a lesson, or null when that could not be worked out. */
export declare function measureAll(periods: Periods, matched: ReadonlySet<number> | null): Measured[];
export {};
//# sourceMappingURL=manager-measures.d.ts.map