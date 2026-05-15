export interface BypassRequest {
    readonly reason: string;
    readonly user: string;
}
export interface BypassToken {
    readonly schema_version: 1;
    readonly reason: string;
    readonly user: string;
    readonly timestamp: string;
}
export declare function recordBypass(workspaceDir: string, request: BypassRequest): Promise<{
    readonly path: string;
}>;
export declare function consumeBypassToken(workspaceDir: string): Promise<BypassToken | null>;
//# sourceMappingURL=bypass.d.ts.map