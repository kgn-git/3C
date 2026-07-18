/** A single parsed process-rule entry. */
export interface ProcessRule {
    readonly id: string;
    readonly title: string;
    readonly origin: string;
    readonly enforcementPoint: string;
    readonly counterfactual: string;
}
/** A validation violation against the derivation standard. */
export interface RuleViolation {
    readonly ruleId: string;
    readonly field: "origin" | "enforcementPoint" | "counterfactual" | "structure";
}
/** The result of validating a rulebook. */
export interface RuleValidationResult {
    readonly valid: boolean;
    readonly rules: ReadonlyArray<ProcessRule>;
    readonly violations: ReadonlyArray<RuleViolation>;
}
/**
 * Parse a rulebook markdown string into its rule entries, without validating them.
 * Entries are delimited by `### PR-NN: Title` headings; everything before the first
 * heading is treated as preamble and ignored. Headings inside a fenced code block
 * (``` or ~~~) are skipped so prose examples of the format are not misparsed as rules.
 * Input above the shared size cap fails closed to an empty result (CWE-400).
 */
export declare function parseRulebook(md: string): ProcessRule[];
/**
 * Validate a rulebook against the 3C derivation standard. A rulebook is valid only if it
 * contains at least one rule, every rule ID is unique, and every rule cites all three
 * derivation-standard fields. Duplicate IDs and missing fields each produce a violation;
 * an empty rulebook produces a single structural violation.
 */
export declare function validateRulebook(md: string): RuleValidationResult;
//# sourceMappingURL=process-rules.d.ts.map