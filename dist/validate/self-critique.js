// Machine-checks `.claude/skills/_shared-context/self-critique-convention.md`. JSON emitters carry
// the marker inside their findings array because a trailing line would break the fenced-JSON
// contract. No frontmatter boolean: a dispatcher could not tell that stamp from a real pass.
import { contentLines, exceedsSizeCap } from "./_markdown.js";
/** Review agents that emit a fenced JSON findings array. */
export const REVIEW_AGENTS = [
    "3c-architect",
    "3c-code-reviewer",
    "3c-journey-architect",
    "3c-product-owner",
    "3c-qa-reviewer",
    "3c-security-reviewer",
    "3c-ux-expert",
];
/** Interactive, so there is no reviewable artefact to gate. */
export const EXEMPT_NAMES = [
    "3c-onboard",
];
export function isExempt(name) {
    return EXEMPT_NAMES.includes(name);
}
export function emitterTypeFor(name) {
    return REVIEW_AGENTS.includes(name) ? "json" : "prose";
}
// End-anchored so `## Self-critique before emitting` is not mistaken for the gate.
const SECTION_HEADING = /^##[ \t]+Self-critique[ \t]*$/;
// A section must name what it critiques, not just say "critique".
const OPTIMISE_RE = /optimi[zs]/i;
const CRITIQUE_TARGET_RE = /(chain[ \t]+of[ \t]+thought|reasoning|\boutput\b|draft)/i;
const PROSE_MARKER = "SELF-CRITIQUE: PASS";
const JSON_MARKER = "self_critique";
// Rejects a two-word stamp; a padded stamp can still pass, so human review is the real guard.
const MIN_BODY_LEN = 40;
// contentLines skips fenced examples, so a heading inside one neither starts nor ends the section.
function sliceSection(md) {
    const lines = md.split(/\r?\n/);
    let start = -1;
    for (const { index, text } of contentLines(md)) {
        if (SECTION_HEADING.test(text)) {
            start = index + 1;
            break;
        }
    }
    if (start < 0)
        return "";
    let end = lines.length;
    for (const { index, text } of contentLines(md)) {
        if (index >= start && /^##[ \t]/.test(text)) {
            end = index;
            break;
        }
    }
    return lines.slice(start, end).join("\n");
}
// Strips the substring, not the line: a JSON emitter's marker sits mid-sentence in its prose.
function bodyWithoutMarker(section, marker) {
    return section.split(marker).join("");
}
export function checkSelfCritique(content, emitter) {
    // Fails closed before any scanning (CWE-400).
    if (exceedsSizeCap(content)) {
        return {
            valid: false,
            hasSection: false,
            hasCritiqueProse: false,
            hasMarker: false,
            reason: "content exceeds size cap",
        };
    }
    const section = sliceSection(content);
    if (!section) {
        return {
            valid: false,
            hasSection: false,
            hasCritiqueProse: false,
            hasMarker: false,
            reason: "no `## Self-critique` section",
        };
    }
    const marker = emitter === "json" ? JSON_MARKER : PROSE_MARKER;
    const hasMarker = section.includes(marker);
    // Marker removed so its own "critique" substring cannot count as critique prose.
    const body = bodyWithoutMarker(section, marker);
    const hasCritiqueProse = OPTIMISE_RE.test(body) &&
        CRITIQUE_TARGET_RE.test(body) &&
        body.replace(/\s+/g, "").length >= MIN_BODY_LEN;
    if (!hasCritiqueProse) {
        return {
            valid: false,
            hasSection: true,
            hasCritiqueProse: false,
            hasMarker,
            reason: "self-critique section is a stamp — no real critique + optimise pass described",
        };
    }
    if (!hasMarker) {
        return {
            valid: false,
            hasSection: true,
            hasCritiqueProse: true,
            hasMarker: false,
            reason: `missing ${emitter} marker (\`${marker}\`)`,
        };
    }
    return {
        valid: true,
        hasSection: true,
        hasCritiqueProse: true,
        hasMarker: true,
        reason: "ok",
    };
}
//# sourceMappingURL=self-critique.js.map