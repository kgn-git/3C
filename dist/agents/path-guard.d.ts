export interface PathGuardEvent {
    readonly agent: string;
    readonly tool: "Read" | "Grep" | "Glob" | "Edit" | "Write" | "Bash" | string;
    readonly path: string;
}
export interface PathGuardDecision {
    readonly allow: boolean;
    readonly reason?: string;
}
export declare function enforceAgentPathPolicy(event: PathGuardEvent): PathGuardDecision;
//# sourceMappingURL=path-guard.d.ts.map