import type { FlagState } from "../../handovers/handover-cache.js";
import type { HandoverRecord } from "../../handovers/handover.js";
import type { Note } from "../../memory/notes.js";
export interface WaitingEntry {
    readonly issue: number;
    /** Whole days since the handover that named it was merged; null when that time is not in the cache. */
    readonly days: number | null;
    readonly state: "open" | "not-checked";
}
export type WaitingList = {
    readonly kind: "checked";
    /** Every entry that is not closed, oldest first. */
    readonly entries: ReadonlyArray<WaitingEntry>;
    /** Issues left out because the flags say they are closed. */
    readonly closed: number;
    /** Open notes that name no issue, so no state can be read for them. */
    readonly noIssue: number;
} | {
    readonly kind: "unchecked";
    readonly named: number;
    readonly noIssue: number;
};
export interface DecisionInput {
    /** The notes of kind `open`. */
    readonly notes: ReadonlyArray<Note>;
    /** Handover number to its merge time, for the handovers the cache holds. */
    readonly merged: ReadonlyMap<number, string>;
    readonly flags: FlagState | null;
    readonly now: Date;
}
export declare function decisionsWaiting(input: DecisionInput): WaitingList;
export interface RiskInput {
    readonly records: ReadonlyArray<Pick<HandoverRecord, "handover" | "issues" | "follow_ups" | "merged">>;
    readonly flags: FlagState | null;
    readonly now: Date;
}
export declare function riskCarried(input: RiskInput): WaitingList;
//# sourceMappingURL=manager-waiting.d.ts.map