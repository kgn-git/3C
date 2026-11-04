import type { FlagState } from "../../handovers/handover-cache.js";
import type { HandoverRecord } from "../../handovers/handover.js";
export declare const FOLLOW_UP_CAP = 10;
export interface WaitingFollowUp {
    readonly issue: number;
    /** The newest handover that named it. */
    readonly named: number;
    /** "open" only when the cache's flags say so; anything else is a state nobody checked. */
    readonly state: "open" | "not-checked";
}
export interface Waiting {
    readonly rows: ReadonlyArray<WaitingFollowUp>;
    /** Waiting follow-ups past the cap, which are not shown. */
    readonly more: number;
    /** Follow-ups left out because the flags say they are closed. */
    readonly closed: number;
}
export interface FollowUpInput {
    readonly records: ReadonlyArray<Pick<HandoverRecord, "handover" | "issues" | "follow_ups">>;
    readonly flags: FlagState | null;
}
export declare function waitingFollowUps(input: FollowUpInput, cap?: number): Waiting;
//# sourceMappingURL=follow-ups.d.ts.map