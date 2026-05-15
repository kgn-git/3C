export interface HookEntry {
    readonly id: string;
    readonly event: "PreToolUse" | "PostToolUse";
    readonly matcher: string;
    readonly command: string;
    readonly timeout: number;
    readonly blocking: boolean;
    readonly network: boolean;
}
export interface HooksConfig {
    readonly schemaVersion: 1;
    readonly hooks: ReadonlyArray<HookEntry>;
}
export interface ConfigError {
    readonly path: string;
    readonly message: string;
    readonly line?: number;
}
export type LoadHooksResult = {
    readonly ok: true;
    readonly config: HooksConfig;
} | {
    readonly ok: false;
    readonly errors: ReadonlyArray<ConfigError>;
};
export declare function loadHooksConfig(workspaceDir: string): Promise<LoadHooksResult>;
//# sourceMappingURL=config.d.ts.map