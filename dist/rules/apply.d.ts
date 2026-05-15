import { type LoadError, type RuleFile } from "./loader.js";
import { type ValidationDiagnostic } from "./validator.js";
export interface ApplyOptions {
    readonly workspaceDir: string;
    readonly frameworkName: string;
    readonly workspaceFiles: ReadonlyArray<string>;
    readonly generatedAt: string;
}
export interface ApplyResult {
    readonly action: "wrote" | "error";
    readonly appliedCount: number;
    readonly skippedCount: number;
    readonly diagnostics: ReadonlyArray<ValidationDiagnostic | LoadError>;
    readonly error?: string;
}
export declare function sortRules(rules: ReadonlyArray<RuleFile>): RuleFile[];
export declare function filterByGlobMatch(rules: ReadonlyArray<RuleFile>, files: ReadonlyArray<string>): RuleFile[];
export declare function renderRulesBlock(rules: ReadonlyArray<RuleFile>, frameworkName: string, generatedAt: string): string;
export declare function injectIntoClaude(claudeMd: string, block: string, frameworkName: string): {
    readonly ok: true;
    readonly content: string;
    readonly replaced: boolean;
} | {
    readonly ok: false;
    readonly error: string;
};
export declare function applyRules(opts: ApplyOptions): Promise<ApplyResult>;
//# sourceMappingURL=apply.d.ts.map