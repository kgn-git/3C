// Retro standing-audit-rows gate. "A gate that stops being audited stops being
// run": every load-bearing gate MUST have a row in the retro's standing-audit
// annex. A row marked "no" is healthy (absence reported); a missing row is a
// violation (the gate was silently omitted).
//
// This gates the annex's completeness, never shipping — the retro stays
// optional. Single-delivery local evidence only; no trend view before L3.
import { contentLines, exceedsSizeCap } from "./_markdown.js";
/**
 * The canonical list of 3C load-bearing gates. Derive membership from the
 * entries, never from prose — a second copy is one that drifts.
 */
export const LOAD_BEARING_GATES = [
    { slug: "scan-secrets", label: "Scan secrets at every write boundary (PR-01)" },
    { slug: "red-before-green", label: "RED before GREEN (PR-02)" },
    { slug: "verify-gate", label: "Project-level verify gate before the PR (PR-02 §6.a)" },
    { slug: "no-auto-merge", label: "No auto-merge / no force-push / no hook bypass (PR-03)" },
    { slug: "reconcile-anti-improvisation", label: "Reconcile anti-improvisation (PR-05)" },
    { slug: "pretooluse-path-guard", label: "PreToolUse path-guard hook" },
    { slug: "sprint-readiness", label: "Sprint enrichment + coherence check before implementation (PR-07)" },
    { slug: "capability-tier", label: "User-facing capability evidenced at the install tier (PR-02 capability head)" },
];
const TABLE_ROW = /^\|(.+)\|\s*$/;
// Anchors the validator to the annex, not the whole document.
const ANNEX_HEADING = /^##\s+standing audit rows\b/i;
function normalizeSlug(cell) {
    return cell
        .replace(/`/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");
}
// At least one dash or colon per cell, so an all-blank row is not a separator
// and cannot re-assert pastSeparator.
function isSeparator(cells) {
    return cells.every((c) => /^[-:]+$/.test(c.trim().replace(/ /g, "")));
}
/**
 * Slice the retro to the `## Standing audit rows` annex (heading to the next
 * `## ` or end). A gate slug in a different retro table must not mask a
 * missing audit row. No heading ⇒ empty slice ⇒ every gate is missing.
 */
function sliceAnnex(md) {
    const lines = md.split(/\r?\n/);
    // contentLines skips fenced lines, so a heading in a fenced example neither
    // starts nor truncates the annex. `index` is the source-line index.
    let start = -1;
    for (const { index, text } of contentLines(md)) {
        if (ANNEX_HEADING.test(text)) {
            start = index + 1;
            break;
        }
    }
    if (start < 0)
        return "";
    let end = lines.length;
    for (const { index, text } of contentLines(md)) {
        if (index >= start && /^##\s/.test(text)) {
            end = index;
            break;
        }
    }
    return lines.slice(start, end).join("\n");
}
/**
 * Parse the annex into rows of `gate | Ran? | evidence`, gate normalised to a
 * slug. Fenced rows are format examples and skipped. Ran? is fail-closed:
 * only "yes" counts, though an ambiguous row still counts as present.
 * Evidence quality is the reviewer's job; this gates completeness only.
 */
export function parseAuditRows(md) {
    if (exceedsSizeCap(md))
        return [];
    return parseRowsFrom(sliceAnnex(md));
}
function parseRowsFrom(block) {
    const rows = [];
    // Only rows after the separator are data, so header labels never parse as a gate.
    let pastSeparator = false;
    for (const { text } of contentLines(block)) {
        const m = text.match(TABLE_ROW);
        if (!m)
            continue;
        const cells = (m[1] ?? "").split("|").map((c) => c.trim());
        if (cells.length < 3)
            continue;
        if (isSeparator(cells)) {
            pastSeparator = true;
            continue;
        }
        if (!pastSeparator)
            continue;
        const gate = normalizeSlug(cells[0] ?? "");
        if (!gate)
            continue;
        const ranCell = (cells[1] ?? "").toLowerCase();
        const ran = ranCell.trim() === "yes";
        // Pipes beyond the third cell belong to the evidence text.
        const evidence = cells.slice(2).join(" | ").trim();
        rows.push({ gate, ran, evidence });
    }
    return rows;
}
/** Valid iff every load-bearing gate has at least one row. */
export function validateAuditRows(md) {
    const rows = parseAuditRows(md);
    const present = new Set(rows.map((r) => r.gate));
    const violations = [];
    for (const gate of LOAD_BEARING_GATES) {
        if (!present.has(gate.slug)) {
            violations.push({ gate: gate.slug, field: "missing-row" });
        }
    }
    return { valid: violations.length === 0, rows, violations };
}
//# sourceMappingURL=retro-audit-rows.js.map