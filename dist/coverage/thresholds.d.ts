export interface CoverageConfig {
    readonly minLines: number;
    readonly exempt: ReadonlyArray<string>;
}
export declare function loadCoverageConfig(workspaceDir: string): Promise<CoverageConfig>;
//# sourceMappingURL=thresholds.d.ts.map