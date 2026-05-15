import type { RuleFile } from "./loader.js";
export interface ValidationDiagnostic {
    readonly path: string;
    readonly line: number;
    readonly severity: "error" | "warning";
    readonly message: string;
    readonly remediation?: string;
}
export interface ValidationResult {
    readonly valid: boolean;
    readonly diagnostics: ReadonlyArray<ValidationDiagnostic>;
}
export declare function validateRule(rule: RuleFile): ValidationResult;
//# sourceMappingURL=validator.d.ts.map