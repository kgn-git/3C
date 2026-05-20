export type FailureCategory = "none" | "validation" | "timeout" | "configuration" | "tool";
export interface TelemetryEvent {
    readonly schema_version: 1;
    readonly hook_id: string;
    readonly trigger_event: string;
    readonly summary: string;
    readonly exit_code: number;
    readonly failure_category: FailureCategory;
    readonly duration_ms: number;
    readonly network_used: boolean;
    readonly self_correction_count: number;
    readonly actor_token: string | null;
    readonly timestamp: string;
}
export declare function isTelemetryEvent(v: unknown): v is TelemetryEvent;
//# sourceMappingURL=record.d.ts.map