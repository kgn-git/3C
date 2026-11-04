import type { HandoverLoc, HandoverRecord, HandoverScan, HandoverVerdict } from "../handovers/handover.js";
export declare const CYCLE_LABEL = "Branch open to merge";
export declare const CYCLE_NOTE = "Time from branch opened to merged. It is not effort.";
export declare const ISSUE_DELIVERIES_LABEL = "Issue deliveries";
export declare const ISSUE_DELIVERIES_PER_WEEK = "Issue deliveries per week";
export declare const ISSUE_DELIVERIES_NOTE = "One for each issue a delivery closed. An issue delivered twice counts twice, and a delivery that closed three issues counts three.";
export declare const NO_ISSUE_DELIVERIES = "No issue deliveries on record.";
export declare const issueDeliveries: (n: number) => string;
export interface DeliveryRow {
    readonly issue: number;
    readonly handover: number;
    readonly title?: string;
    readonly pr?: number;
    readonly merged?: string;
    readonly cycleMs?: number;
    readonly verdict?: HandoverVerdict;
    readonly loc?: HandoverLoc;
    readonly followUps: number;
}
export interface DeliveryMetrics {
    readonly rows: ReadonlyArray<DeliveryRow>;
    readonly issueDeliveriesPerWeek: ReadonlyArray<{
        week: string;
        count: number;
    }>;
    readonly medianCycleMs: number | null;
    readonly verdictDistribution: Readonly<Record<string, number>>;
    readonly followUpRatio: number | null;
    readonly legacy: number;
    readonly malformed: number;
}
/** A span of time as minutes, hours or days, whichever reads best. */
export declare const fmtCycle: (ms: number) => string;
export declare function cycleMs(r: HandoverRecord): number | undefined;
export declare function median(values: number[]): number | null;
export declare function deliveryMetrics(scan: HandoverScan): DeliveryMetrics;
//# sourceMappingURL=delivery.d.ts.map