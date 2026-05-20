import { type Metrics } from "../telemetry/aggregate.js";
import type { TelemetryEvent } from "../telemetry/record.js";
export interface DashboardMetrics extends Metrics {
    readonly selfCorrectionRate: number;
    readonly timeInGatesMs: number;
    readonly dailyPassRate: ReadonlyArray<{
        date: string;
        runs: number;
        passRate: number;
    }>;
}
export declare function dashboardMetrics(records: ReadonlyArray<TelemetryEvent>): DashboardMetrics;
//# sourceMappingURL=metrics.d.ts.map