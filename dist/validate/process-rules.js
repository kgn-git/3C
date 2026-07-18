// 3C process-rule derivation & curation discipline (issue #305).
// Validates the canonical rulebook at `.claude/skills/_shared-context/process-rules.md`
// against the 3C-native derivation standard: every rule MUST carry (a) a witnessed-failure
// origin, (b) a named enforcement point in a skill/agent file, and (c) a counterfactual
// against existing rules. The cull / prefer-FOLD-over-PROMOTE policy is policed by the
// same three-field check — a rule that cannot cite all three fails validation, which is
// exactly the "could this rule have been born under the standard?" audit.
import { contentLines, stripFencedBlocks, exceedsSizeCap } from "./_markdown.js";
// A rule entry begins with a `### PR-NN: Title` heading.
const RULE_HEADER = /^###\s+(PR-\d+)\s*:\s*(.+?)\s*$/;
// Each required derivation-standard field is a bold-labelled line. The value is the
// remainder of that line; multiline continuations are not part of the contract. The
// whitespace classes are `[ \t]` (not `\s`) deliberately: `\s` crosses newlines, so a bare
// `**Origin:**` label with no value would otherwise match across the newline and capture the
// *next* line as its value — the exact cull-evasion the discipline must reject.
const FIELD_PATTERNS = {
    origin: /^\*\*Origin:\*\*[ \t]*(.+?)[ \t]*$/m,
    enforcementPoint: /^\*\*Enforcement point:\*\*[ \t]*(.+?)[ \t]*$/m,
    counterfactual: /^\*\*Counterfactual:\*\*[ \t]*(.+?)[ \t]*$/m,
};
// Field extraction is fence-aware (#317): a `**Origin:**` line inside a fenced example within a
// rule block must NOT satisfy the field — the block is stripped of fenced regions first.
function extractField(block, field) {
    const match = stripFencedBlocks(block).match(FIELD_PATTERNS[field]);
    return match && match[1] ? match[1] : "";
}
/**
 * Parse a rulebook markdown string into its rule entries, without validating them.
 * Entries are delimited by `### PR-NN: Title` headings; everything before the first
 * heading is treated as preamble and ignored. Headings inside a fenced code block
 * (``` or ~~~) are skipped so prose examples of the format are not misparsed as rules.
 * Input above the shared size cap fails closed to an empty result (CWE-400).
 */
export function parseRulebook(md) {
    if (exceedsSizeCap(md))
        return [];
    const lines = md.split(/\r?\n/);
    const rules = [];
    let currentId = null;
    let currentTitle = null;
    let currentStart = 0;
    const flush = (block, id, title) => {
        rules.push({
            id,
            title,
            origin: extractField(block, "origin"),
            enforcementPoint: extractField(block, "enforcementPoint"),
            counterfactual: extractField(block, "counterfactual"),
        });
    };
    // contentLines skips fenced-block lines (same-char close, ``` and ~~~), so a heading inside a
    // prose example is never taken as a real rule entry; `index` is the original line index used to
    // slice each rule's block from the source.
    for (const { index, text } of contentLines(md)) {
        const header = text.match(RULE_HEADER);
        if (header) {
            if (currentId !== null && currentTitle !== null) {
                flush(lines.slice(currentStart, index).join("\n"), currentId, currentTitle);
            }
            currentId = header[1] ?? "";
            currentTitle = header[2] ?? "";
            currentStart = index;
        }
    }
    if (currentId !== null && currentTitle !== null) {
        flush(lines.slice(currentStart).join("\n"), currentId, currentTitle);
    }
    return rules;
}
/**
 * Validate a rulebook against the 3C derivation standard. A rulebook is valid only if it
 * contains at least one rule, every rule ID is unique, and every rule cites all three
 * derivation-standard fields. Duplicate IDs and missing fields each produce a violation;
 * an empty rulebook produces a single structural violation.
 */
export function validateRulebook(md) {
    const rules = parseRulebook(md);
    const violations = [];
    if (rules.length === 0) {
        violations.push({ ruleId: "-", field: "structure" });
        return { valid: false, rules, violations };
    }
    const seenIds = new Set();
    for (const rule of rules) {
        if (seenIds.has(rule.id)) {
            violations.push({ ruleId: rule.id, field: "structure" });
        }
        else {
            seenIds.add(rule.id);
        }
        if (!rule.origin)
            violations.push({ ruleId: rule.id, field: "origin" });
        if (!rule.enforcementPoint)
            violations.push({ ruleId: rule.id, field: "enforcementPoint" });
        if (!rule.counterfactual)
            violations.push({ ruleId: rule.id, field: "counterfactual" });
    }
    return { valid: violations.length === 0, rules, violations };
}
//# sourceMappingURL=process-rules.js.map