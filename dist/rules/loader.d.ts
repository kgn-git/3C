export interface RuleFile {
    readonly path: string;
    readonly filename: string;
    readonly fields: Record<string, string | number | string[]>;
    readonly body: string;
    readonly bodyStartLine: number;
}
export type LoadMode = "inject" | "disk";
/** A rule's load mode; anything but an explicit `inject` stays on disk. */
export declare function loadModeOf(rule: RuleFile): LoadMode;
export interface LoadError {
    readonly path: string;
    readonly line: number;
    readonly message: string;
}
export interface LoadResult {
    readonly rules: ReadonlyArray<RuleFile>;
    readonly errors: ReadonlyArray<LoadError>;
}
export declare function loadRules(rulesDir: string): Promise<LoadResult>;
//# sourceMappingURL=loader.d.ts.map