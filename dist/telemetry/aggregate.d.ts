import type { TelemetryEvent, FailureCategory } from "./record.js";
export interface Metrics {
    readonly totalRuns: number;
    readonly passRate: number;
    readonly failureCategories: Readonly<Record<string, number>>;
    readonly commonPatterns: ReadonlyArray<{
        hook_id: string;
        failure_category: FailureCategory;
        count: number;
    }>;
}
export declare function aggregate(records: ReadonlyArray<TelemetryEvent>): Metrics;
//# sourceMappingURL=aggregate.d.ts.map