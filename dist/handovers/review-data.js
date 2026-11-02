// The review data a handover block may carry: how many findings the board
// raised in each category, and how many rounds it took. A block is written by
// anyone able to open an issue, so a category outside the list is refused
// rather than stored (CWE-20), and every count is bounded (CWE-400).
import { isCountUpTo } from "./counts.js";
// The categories the agent templates declare in their findings line, plus the
// ones the architect, code reviewer and security reviewer report. The list sits
// in the platform tier because the parser reads it and may not import features.
// Its size is the bound on the number of keys.
export const REVIEW_CATEGORIES = new Set([
    "scope",
    "acceptance-criteria",
    "maturity",
    "priority",
    "dependency",
    "entry-point",
    "path-integrity",
    "dead-end",
    "journey-coverage",
    "regression",
    "coverage",
    "edge-case",
    "test-quality",
    "usability",
    "accessibility",
    "copy",
    "layering",
    "security",
    "correctness",
    "quality",
    "other",
]);
// CWE-400 bounds on what a block can claim.
export const REVIEW_LIMITS = { countMax: 1_000, boardRounds: 50 };
/**
 * A copy of `by_category` with no prototype, or null when it is not a map of
 * listed categories to bounded counts. The copy is the record's only form, so
 * a lookup by an arbitrary name cannot reach `Object.prototype`.
 */
export function readByCategory(v) {
    if (typeof v !== "object" || v === null || Array.isArray(v))
        return null;
    const out = Object.create(null);
    for (const [k, count] of Object.entries(v)) {
        if (!REVIEW_CATEGORIES.has(k) || !isCountUpTo(count, REVIEW_LIMITS.countMax))
            return null;
        out[k] = count;
    }
    return out;
}
//# sourceMappingURL=review-data.js.map