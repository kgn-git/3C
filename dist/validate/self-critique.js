// 3C universal self-critique gate (issue #308).
// Machine-checks the convention defined in `.claude/skills/_shared-context/self-critique-convention.md`:
// every non-exempt SKILL.md and agents/*.md carries a `## Self-critique` section that (a) critiques
// the chain of thought / reasoning and the draft output, (b) describes at least one in-context
// optimisation pass, and (c) emits the marker for its emitter type. The marker convention is split
// by emitter (binding constraint #1): JSON-emitting review agents carry `self_critique` INSIDE their
// findings array (a trailing line would break the fenced-JSON contract); prose skills/orchestrators
// use a `SELF-CRITIQUE: PASS` final line. A stamp-only section — the marker with no critique +
// optimise prose — is rejected (AC4). Exemptions are explicit (AC5): `3c-onboard` (interactive) and
// `3c-onboard-guide` (reference material). No frontmatter boolean — the gate is body prose + a real
// in-context pass, not a rubber stamp a dispatcher cannot distinguish from a real pass (AC4).
import { contentLines, exceedsSizeCap } from "./_markdown.js";
/** The 6 review agents that emit a fenced JSON findings array (in-JSON marker). */
export const REVIEW_AGENTS = [
    "3c-architect",
    "3c-code-reviewer",
    "3c-product-owner",
    "3c-qa-reviewer",
    "3c-security-reviewer",
    "3c-ux-expert",
];
/** Explicitly exempt skills/agents (AC5) — interactive or reference, not emission gates. */
export const EXEMPT_NAMES = [
    "3c-onboard",
    "3c-onboard-guide",
];
/** True if the skill/agent basename is explicitly exempt (no silent exemptions). */
export function isExempt(name) {
    return EXEMPT_NAMES.includes(name);
}
/** Resolve the emitter type for a skill/agent basename. Review agents → JSON; all else → prose. */
export function emitterTypeFor(name) {
    return REVIEW_AGENTS.includes(name) ? "json" : "prose";
}
// The `## Self-critique` heading — end-anchored so a `## Self-critique marker — …` or
// `## Self-critique before emitting` heading is NOT mistaken for the gate. `## ` only (a
// `### Self-critique` subsection is not the gate).
const SECTION_HEADING = /^##[ \t]+Self-critique[ \t]*$/;
// Critique targets. A conforming section names WHAT it critiques — the reasoning / chain of
// thought / output — not just the word "critique". Both spellings: optimise / optimize.
const OPTIMISE_RE = /optimi[zs]/i;
const CRITIQUE_TARGET_RE = /(chain[ \t]+of[ \t]+thought|reasoning|\boutput\b|draft)/i;
// The marker strings (per emitter) — excluded from the critique-prose check so a stamp that
// merely utters the marker cannot satisfy the critique-target requirement.
const PROSE_MARKER = "SELF-CRITIQUE: PASS";
const JSON_MARKER = "self_critique";
// Minimum substantive body length (excluding the marker line). A real critique+optimise pass is
// a sentence or more; a two-word stamp ("Critique. Optimise.") is shorter than this. A structural
// heuristic only — a padded rubber-stamp can still fool it, so the real guard is the in-context
// pass itself (see the convention doc's "not a rubber-stamp" framing + human review).
const MIN_BODY_LEN = 40;
// Slice the `## Self-critique` section body out of `md`. Uses the shared contentLines iterator
// (#317) so a `## Self-critique` heading inside a ```/~~~ prose example is not taken as the real
// gate, and a `## ` heading inside a fenced example within the section does not truncate it —
// CommonMark same-char fence fidelity (#308→#313 AC6) lives in one place now (`_markdown.ts`).
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
        // A sibling `## ` heading (outside a fence) after the section heading ends the section.
        if (index >= start && /^##[ \t]/.test(text)) {
            end = index;
            break;
        }
    }
    return lines.slice(start, end).join("\n");
}
// The section body with the marker substring removed, so the critique-target check is not satisfied
// by the marker substring alone (both markers contain "critique"/"self_critique"). Substring (not
// line-filter): JSON-emitter sections are single-line paragraphs where `self_critique` appears inline
// mid-sentence, so filtering the whole line would nuke the entire critique prose. Stripping just the
// marker substring leaves the sentence intact for the critique-target + length checks.
function bodyWithoutMarker(section, marker) {
    return section.split(marker).join("");
}
/**
 * Check that `content` carries a conforming self-critique gate for the given emitter type. A
 * conforming gate: a `## Self-critique` section whose body describes a critique of the reasoning
 * AND the output plus at least one optimisation pass (not a stamp), and emits the correct marker —
 * `SELF-CRITIQUE: PASS` for prose, the `self_critique` JSON field for JSON emitters.
 */
export function checkSelfCritique(content, emitter) {
    // Over-cap input fails closed (CWE-400) before any scanning.
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
    // Critique-prose is measured on the body WITH the marker line stripped, so the marker's own
    // "critique" substring cannot satisfy the critique-target check, and a substantive length is
    // required so a two-word stamp fails.
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