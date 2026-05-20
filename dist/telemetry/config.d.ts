export interface TelemetryConfig {
    readonly enabled: boolean;
    readonly anonymise: boolean;
    readonly sync: {
        readonly enabled: boolean;
        readonly endpoint: string | null;
        readonly flushThreshold: number;
    };
    readonly retentionDays: number;
}
export declare function loadTelemetryConfig(workspaceDir: string): Promise<TelemetryConfig>;
//# sourceMappingURL=config.d.ts.map