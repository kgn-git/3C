/** A parsed standing-audit row. */
export interface AuditRow {
    readonly gate: string;
    readonly ran: boolean;
    readonly evidence: string;
}
/** A load-bearing gate that gets a mandatory standing audit row. */
export interface LoadBearingGate {
    readonly slug: string;
    readonly label: string;
}
/** The canonical list of 3C load-bearing gates (PR-01/02/03/05 + the PreToolUse path-guard). */
export declare const LOAD_BEARING_GATES: ReadonlyArray<LoadBearingGate>;
/** A validation violation: a load-bearing gate with no audit row (silently omitted). */
export interface AuditRowViolation {
    readonly gate: string;
    readonly field: "missing-row";
}
/** The result of validating a standing-audit annex. */
export interface AuditRowValidationResult {
    readonly valid: boolean;
    readonly rows: ReadonlyArray<AuditRow>;
    readonly violations: ReadonlyArray<AuditRowViolation>;
}
/**
 * Parse a markdown standing-audit annex into its rows. A row is a table line with three cells:
 * gate | Ran? | evidence. The gate cell is normalised to a canonical slug (lowercase, hyphenated,
 * backticks stripped). Rows inside a fenced code block (``` or ~~~) are skipped — they are prose
 * examples of the format, not real audit rows. The Ran? cell is "yes" only when it clearly says
 * yes (fail-closed on ambiguous: "probably" is not a "yes", but the row still counts as present).
 * Evidence *content* is not machine-enforced (a row with empty evidence still counts as present)
 * — the validator gates *completeness* (every gate accounted for), not evidence quality, which is
 * the human reviewer's job (the same scope split #306 draws for candidate semantic truth).
 */
export declare function parseAuditRows(md: string): AuditRow[];
/**
 * Validate a standing-audit annex. The annex is valid iff every load-bearing gate has at least one
 * row. A gate marked "no" (did not run) is healthy — absence was reported. A gate with no row at
 * all is a violation (silently omitted). Zero rows → every gate is a missing-row violation.
 */
export declare function validateAuditRows(md: string): AuditRowValidationResult;
//# sourceMappingURL=retro-audit-rows.d.ts.map