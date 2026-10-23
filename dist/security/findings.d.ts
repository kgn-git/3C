import type { Severity } from "./severity.js";
export interface Finding {
    readonly id: string;
    readonly severity: Severity;
    readonly ruleId: string;
    readonly file: string;
    readonly line: number;
    readonly detail: string;
}
export interface ScanInput {
    readonly workspaceDir: string;
    readonly changedFiles: ReadonlyArray<string>;
}
export interface Scanner {
    scan(input: ScanInput): Promise<Finding[]>;
}
/**
 * Keyed on what was found, not where: a positional id would let a new secret
 * inserted above a suppressed one inherit its suppression (fail-open).
 * Identical secrets in one file therefore share an id; accepted.
 * Unsalted on purpose: a committed suppression must match in every clone. An
 * id leaked without its file could be dictionary-tested; accepted, since the
 * suppressed value already sits in the same repository.
 */
export declare function findingId(ruleId: string, file: string, discriminator: string): string;
/** Hashed so the raw secret stays out of the id input. */
export declare function matchDigest(raw: string): string;
//# sourceMappingURL=findings.d.ts.map