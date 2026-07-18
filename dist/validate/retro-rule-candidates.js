// 3C retro rule-candidate derivation gate (issue #306).
// Validates `RULE-CANDIDATE — <slug>` blocks emitted by `/3c-retrospective`'s optional
// derivation annex against the 3C-native discipline: a candidate is accepted only if it is
// DERIVED (a full chain) — never HARVESTED (a bare rule statement), never NUMBERED (a human
// numbers at a rules review, not the retro — PROPOSES, never PROMOTES), and not DISQUALIFIED
// (an existing gate already caught it / it is a product defect / it is an engineering technique).
// Prefer-FOLD-over-PROMOTE is expressed via the existing-rule-overlap + counterfactual fields.
//
// Scope limits (enforced at human review, NOT by this validator): the validator checks FIELD
// PRESENCE, not semantic truth — it cannot verify the origin against merged code, nor detect a
// "best practice" line that secretly still references the incident, nor enforce that an
// existing-rule-overlap citation is actually framed as an amendment (FOLD). Those are the rules
// review's job (#305 curation). This gates candidate *structural* quality only, never shipping.
import { contentLines, stripFencedBlocks, exceedsSizeCap } from "./_markdown.js";
// A candidate label line. Whitespace classes are `[ \t]` (not `\s`): `\s` crosses newlines, so
// `\s*` after the em-dash would match the newline and capture the *next* line as the slug — the
// cross-line capture shape caught in #305. The slug MUST NOT be a number or a `PR-NN` id: the
// retro PROPOSES, never PROMOTES; a human numbers at the review.
const LABEL_LINE = /^RULE-CANDIDATE[ \t]+—[ \t]*(.+?)[ \t]*$/;
const NUMBERED_SLUG = /^(?:PR-\d+|\d+)$/i;
// The derivation chain + the disqualifier check. Whitespace classes are `[ \t]` for the same
// cross-newline reason; `.+?` is bounded by the line anchor so each field stays single-line.
const FIELD_PATTERNS = {
    originVerified: /^\*\*Origin \(verified against merged code\):\*\*[ \t]*(.+?)[ \t]*$/m,
    rootCause: /^\*\*Root cause:\*\*[ \t]*(.+?)[ \t]*$/m,
    bestPractice: /^\*\*Best practice \(without the incident\):\*\*[ \t]*(.+?)[ \t]*$/m,
    transitionPoint: /^\*\*Transition point \+ actor:\*\*[ \t]*(.+?)[ \t]*$/m,
    existingRuleOverlap: /^\*\*Existing-rule overlap:\*\*[ \t]*(.+?)[ \t]*$/m,
    counterfactual: /^\*\*Counterfactual:\*\*[ \t]*(.+?)[ \t]*$/m,
    disqualifier: /^\*\*Disqualifier check:\*\*[ \t]*(.+?)[ \t]*$/m,
};
// A disqualifier is the LEADING token of the Disqualifier check line. "none" passes; the three
// disqualifier tokens reject; anything else is unknown (and therefore rejecting). The `\b`
// prevents `none` from matching the prefix of a longer word like `nonexistent`.
const DISQUALIFIER_TOKEN = /^(none|existing-gate-caught-it|product-defect|engineering-technique)\b/i;
// Fence-aware (#317): a field label inside a fenced example within the span must NOT satisfy the
// field — the span is stripped of fenced regions before matching.
function extractField(block, field) {
    const match = stripFencedBlocks(block).match(FIELD_PATTERNS[field]);
    return match && match[1] ? match[1] : "";
}
/** Validate a parsed candidate's fields, returning its violations (no re-parse). */
function validateParsed(candidate) {
    const violations = [];
    const add = (field) => {
        violations.push({ slug: candidate.slug, field });
    };
    if (NUMBERED_SLUG.test(candidate.slug))
        add("slug");
    if (!candidate.originVerified)
        add("originVerified");
    if (!candidate.rootCause)
        add("rootCause");
    if (!candidate.bestPractice)
        add("bestPractice");
    if (!candidate.transitionPoint)
        add("transitionPoint");
    if (!candidate.existingRuleOverlap)
        add("existingRuleOverlap");
    if (!candidate.counterfactual)
        add("counterfactual");
    // Disqualifier check: must be present and must lead with `none`. A missing check, an unknown
    // token, or an explicit disqualifier all reject (the last is the intended outcome — a
    // disqualified candidate is correctly rejected by the gate).
    const dqMatch = candidate.disqualifier.match(DISQUALIFIER_TOKEN);
    const token = dqMatch ? (dqMatch[1] ?? "").toLowerCase() : "";
    if (token !== "none")
        add("disqualifier");
    return violations;
}
/**
 * Split an annex into per-candidate text spans. Each candidate's span runs from its
 * `RULE-CANDIDATE — <slug>` label line to the next label line (or end-of-input), so a field
 * can never be extracted from another candidate's span — the inter-candidate cull-evasion.
 * Labels inside fenced code blocks are skipped so prose examples are not misparsed.
 */
function splitCandidateSpans(md) {
    const lines = md.split(/\r?\n/);
    const labels = [];
    // contentLines skips fenced-block lines (same-char close, ``` and ~~~), so a label inside a
    // prose example is never taken as a real candidate; `index` is the original source-line index.
    for (const { index, text } of contentLines(md)) {
        const m = text.match(LABEL_LINE);
        if (m)
            labels.push({ line: index, slug: m[1] ?? "" });
    }
    const spans = [];
    for (let idx = 0; idx < labels.length; idx++) {
        const start = labels[idx].line;
        const end = idx + 1 < labels.length ? labels[idx + 1].line : lines.length;
        spans.push({ slug: labels[idx].slug, span: lines.slice(start, end).join("\n") });
    }
    return spans;
}
function candidateFromSpan(slug, span) {
    return {
        slug,
        originVerified: extractField(span, "originVerified"),
        rootCause: extractField(span, "rootCause"),
        bestPractice: extractField(span, "bestPractice"),
        transitionPoint: extractField(span, "transitionPoint"),
        existingRuleOverlap: extractField(span, "existingRuleOverlap"),
        counterfactual: extractField(span, "counterfactual"),
        disqualifier: extractField(span, "disqualifier"),
    };
}
/**
 * Parse every `RULE-CANDIDATE` block in an annex. Each candidate's fields are extracted from its
 * own span only, so candidates cannot cross-contaminate. Labels inside fenced code blocks are
 * ignored.
 */
export function parseAllCandidates(md) {
    if (exceedsSizeCap(md))
        return [];
    return splitCandidateSpans(md).map(({ slug, span }) => candidateFromSpan(slug, span));
}
/**
 * Parse the FIRST candidate block in `md`, or null if none. Fields are drawn from that
 * candidate's span only. For multi-candidate annexes, use `parseAllCandidates` / `validateAnnex`.
 */
export function parseCandidate(md) {
    const all = parseAllCandidates(md);
    return all.length > 0 ? all[0] : null;
}
/**
 * Validate the FIRST candidate block in `md`. No label → a structural violation (invalid). This
 * is the per-block helper; for a whole annex (zero or more candidates) use `validateAnnex`, where
 * zero candidates is a healthy, valid result.
 */
export function validateCandidate(block) {
    // Over-cap input fails closed with a structural violation (CWE-400) — never the healthy path.
    if (exceedsSizeCap(block)) {
        return {
            valid: false,
            candidate: null,
            violations: [{ slug: "-", field: "structure" }],
        };
    }
    const candidate = parseCandidate(block);
    if (candidate === null) {
        return {
            valid: false,
            candidate: null,
            violations: [{ slug: "-", field: "structure" }],
        };
    }
    const violations = validateParsed(candidate);
    return { valid: violations.length === 0, candidate, violations };
}
/**
 * Validate a whole annex. Zero candidates is healthy → `valid: true`. One or more candidates →
 * valid iff every candidate passes the derivation chain + disqualifier check. Each candidate's
 * fields are scoped to its own span, so a missing field in one candidate cannot be satisfied by
 * another.
 */
export function validateAnnex(md) {
    // Over-cap input fails closed with a structural violation (CWE-400). This guard MUST precede the
    // zero-candidates check below, which is the HEALTHY path — an oversize annex is not healthy.
    if (exceedsSizeCap(md)) {
        return {
            valid: false,
            candidates: [],
            violations: [{ slug: "-", field: "structure" }],
        };
    }
    const candidates = parseAllCandidates(md);
    if (candidates.length === 0) {
        return { valid: true, candidates, violations: [] };
    }
    const violations = candidates.flatMap(validateParsed);
    return { valid: violations.length === 0, candidates, violations };
}
//# sourceMappingURL=retro-rule-candidates.js.map