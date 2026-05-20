import type { RuleFile } from "../rules/loader.js";
export interface BudgetResult {
    readonly kept: RuleFile[];
    readonly dropped: RuleFile[];
    readonly count: number;
    readonly remaining: number;
    readonly debugLog: string[];
}
export declare function enforceBudget(rules: ReadonlyArray<RuleFile>, claudeMdText: string, max?: number): BudgetResult;
//# sourceMappingURL=budget.d.ts.map