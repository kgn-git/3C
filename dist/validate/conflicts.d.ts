export type ConflictCategory = "indentation" | "punctuation" | "quoting" | "naming" | "test-framework" | "package-manager" | "linter" | "formatter" | "bundler" | "module-format";
export interface ConflictMatch {
    readonly pair: readonly [string, string];
    readonly category: ConflictCategory;
}
export interface ConflictScanResult {
    readonly conflicts: ReadonlyArray<ConflictMatch>;
}
export declare function scanConflicts(text: string): ConflictScanResult;
//# sourceMappingURL=conflicts.d.ts.map