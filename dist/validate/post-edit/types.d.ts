export declare const RULE_IDS: readonly ["import-order", "naming-convention", "layer-boundary"];
export type RuleId = (typeof RULE_IDS)[number];
export interface Violation {
    readonly ruleId: RuleId;
    readonly line: number;
    readonly message: string;
}
export interface LayerMap {
    readonly layers: Readonly<Record<string, ReadonlyArray<string>>>;
    readonly deny: ReadonlyArray<readonly [string, string]>;
}
export interface PostEditResult {
    readonly violations: ReadonlyArray<Violation>;
    readonly message: string;
}
//# sourceMappingURL=types.d.ts.map