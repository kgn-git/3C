export interface HookExecutionRecord {
    readonly schema_version: 1;
    readonly hook_id: string;
    readonly trigger_event: string;
    readonly input_summary: string;
    readonly exit_code: number;
    readonly duration_ms: number;
    readonly network_used: boolean;
    readonly self_correction_count: number;
    readonly timestamp: string;
}
export declare function appendHookEvent(workspaceDir: string, record: HookExecutionRecord): Promise<void>;
//# sourceMappingURL=event-log.d.ts.map