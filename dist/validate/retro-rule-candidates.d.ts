/** A parsed RULE-CANDIDATE block. */
export interface RuleCandidate {
    readonly slug: string;
    readonly originVerified: string;
    readonly rootCause: string;
    readonly bestPractice: string;
    readonly transitionPoint: string;
    readonly existingRuleOverlap: string;
    readonly counterfactual: string;
    readonly disqualifier: string;
}
/** A validation violation against the derivation discipline. */
export interface CandidateViolation {
    readonly slug: string;
    readonly field: "slug" | "originVerified" | "rootCause" | "bestPractice" | "transitionPoint" | "existingRuleOverlap" | "counterfactual" | "disqualifier" | "structure";
}
/** The result of validating one candidate block. */
export interface CandidateValidationResult {
    readonly valid: boolean;
    readonly candidate: RuleCandidate | null;
    readonly violations: ReadonlyArray<CandidateViolation>;
}
/** The result of validating a whole annex (zero or more candidates). */
export interface AnnexValidationResult {
    readonly valid: boolean;
    readonly candidates: ReadonlyArray<RuleCandidate>;
    readonly violations: ReadonlyArray<CandidateViolation>;
}
/**
 * Parse every `RULE-CANDIDATE` block in an annex. Each candidate's fields are extracted from its
 * own span only, so candidates cannot cross-contaminate. Labels inside fenced code blocks are
 * ignored.
 */
export declare function parseAllCandidates(md: string): RuleCandidate[];
/**
 * Parse the FIRST candidate block in `md`, or null if none. Fields are drawn from that
 * candidate's span only. For multi-candidate annexes, use `parseAllCandidates` / `validateAnnex`.
 */
export declare function parseCandidate(md: string): RuleCandidate | null;
/**
 * Validate the FIRST candidate block in `md`. No label → a structural violation (invalid). This
 * is the per-block helper; for a whole annex (zero or more candidates) use `validateAnnex`, where
 * zero candidates is a healthy, valid result.
 */
export declare function validateCandidate(block: string): CandidateValidationResult;
/**
 * Validate a whole annex. Zero candidates is healthy → `valid: true`. One or more candidates →
 * valid iff every candidate passes the derivation chain + disqualifier check. Each candidate's
 * fields are scoped to its own span, so a missing field in one candidate cannot be satisfied by
 * another.
 */
export declare function validateAnnex(md: string): AnnexValidationResult;
//# sourceMappingURL=retro-rule-candidates.d.ts.map