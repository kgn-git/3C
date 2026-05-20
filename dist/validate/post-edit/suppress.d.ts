import { type RuleId } from "./types.js";
export interface SuppressConfig {
    readonly ruleIds: ReadonlySet<string>;
    readonly pathGlobs: ReadonlyArray<string>;
}
export declare function loadSuppress(workspaceDir: string): Promise<SuppressConfig>;
export declare function isSuppressed(ruleId: RuleId, filePath: string, cfg: SuppressConfig): boolean;
//# sourceMappingURL=suppress.d.ts.map