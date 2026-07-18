import type { HandoverLoc, HandoverScan, HandoverVerdict } from "./handover.js";
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
    readonly shippedPerWeek: ReadonlyArray<{
        week: string;
        count: number;
    }>;
    readonly medianCycleMs: number | null;
    readonly verdictDistribution: Readonly<Record<string, number>>;
    readonly followUpRatio: number | null;
    readonly legacy: number;
    readonly malformed: number;
}
export declare function deliveryMetrics(scan: HandoverScan): DeliveryMetrics;
//# sourceMappingURL=delivery.d.ts.map