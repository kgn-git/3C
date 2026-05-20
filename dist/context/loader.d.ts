import type { RuleFile } from "../rules/loader.js";
export interface DynamicContext {
    readonly rules: RuleFile[];
    readonly claudeMd: string;
    readonly instructionCount: number;
    readonly remainingBudget: number;
    readonly debugLog: string[];
}
export declare function loadDynamicContext(workspaceDir: string, filePath: string): Promise<DynamicContext>;
//# sourceMappingURL=loader.d.ts.map