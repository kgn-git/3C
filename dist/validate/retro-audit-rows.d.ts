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
/**
 * The canonical list of 3C load-bearing gates. Derive membership from the
 * entries, never from prose — a second copy is one that drifts.
 */
export declare const LOAD_BEARING_GATES: ReadonlyArray<LoadBearingGate>;
/** A load-bearing gate with no audit row (silently omitted). */
export interface AuditRowViolation {
    readonly gate: string;
    readonly field: "missing-row";
}
export interface AuditRowValidationResult {
    readonly valid: boolean;
    readonly rows: ReadonlyArray<AuditRow>;
    readonly violations: ReadonlyArray<AuditRowViolation>;
}
/**
 * Parse the annex into rows of `gate | Ran? | evidence`, gate normalised to a
 * slug. Fenced rows are format examples and skipped. Ran? is fail-closed:
 * only "yes" counts, though an ambiguous row still counts as present.
 * Evidence quality is the reviewer's job; this gates completeness only.
 */
export declare function parseAuditRows(md: string): AuditRow[];
/** Valid iff every load-bearing gate has at least one row. */
export declare function validateAuditRows(md: string): AuditRowValidationResult;
//# sourceMappingURL=retro-audit-rows.d.ts.map