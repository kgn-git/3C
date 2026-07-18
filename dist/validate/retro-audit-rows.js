// 3C retro standing-audit-rows gate (issue #307).
// Validates the mandatory standing audit rows `/3c-retrospective` emits for 3C's load-bearing
// gates. The invariant is "a gate that stops being audited stops being run": every load-bearing
// gate MUST have a row in the retro's standing-audit annex, citing local evidence for the single
// delivery. A gate that did NOT run on the delivery is SURFACED — its row is present and marked
// "no" — which is healthy (absence reported). A gate with NO row at all is a violation: the gate
// was silently omitted, and a silently-omitted gate is one that has stopped being audited.
//
// This validator gates the audit annex's *completeness*, never shipping — the retro remains
// optional and never a blocking gate (#306 AC6, #307 NFR). Scope: single-delivery local evidence
// only; NO accumulated trend view before L3 (#307 binding constraint #2).
import { contentLines, exceedsSizeCap } from "./_markdown.js";
/** The canonical list of 3C load-bearing gates (PR-01/02/03/05 + the PreToolUse path-guard). */
export const LOAD_BEARING_GATES = [
    { slug: "scan-secrets", label: "Scan secrets at every write boundary (PR-01)" },
    { slug: "red-before-green", label: "RED before GREEN (PR-02)" },
    { slug: "no-auto-merge", label: "No auto-merge / no force-push / no hook bypass (PR-03)" },
    { slug: "reconcile-anti-improvisation", label: "Reconcile anti-improvisation (PR-05)" },
    { slug: "pretooluse-path-guard", label: "PreToolUse path-guard hook" },
];
// A markdown table row: `| cell | cell | cell |`. The pipe-split yields >=3 cells for a real row;
// a separator row (`|------|------|`) is skipped by detecting that every cell is dashes/colons.
const TABLE_ROW = /^\|(.+)\|\s*$/;
// The annex heading. The retro writes it as `## Standing audit rows`; matched case-insensitively
// on the heading text so the validator is anchored to the annex, not the whole document.
const ANNEX_HEADING = /^##\s+standing audit rows\b/i;
function normalizeSlug(cell) {
    return cell
        .replace(/`/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");
}
// A separator row's cells are dashes/colons only — at least one dash or colon, so an all-spaces
// (or empty) row is NOT mistaken for a separator and cannot re-assert pastSeparator.
function isSeparator(cells) {
    return cells.every((c) => /^[-:]+$/.test(c.trim().replace(/ /g, "")));
}
/**
 * Slice the retro down to the `## Standing audit rows` annex. The annex runs from its heading to
 * the next `## ` heading (or end-of-input); anything outside it — other retro tables whose first
 * column might hold a canonical slug — is ignored. This is the scope guard against the
 * cull-evasion false-negative: a gate slug in a *different* retro table must NOT mask a missing
 * audit row (#305/#306 cross-bleed class). If no annex heading is present, the slice is empty
 * (the annex is absent → every gate is a missing-row violation in `validateAuditRows`).
 */
function sliceAnnex(md) {
    const lines = md.split(/\r?\n/);
    // Both scans use the shared contentLines iterator (same-char fence close, ``` and ~~~), so a
    // heading inside a fenced prose example is neither taken as the annex (start) nor allowed to
    // prematurely truncate it (end). `index` is the original source-line index used to slice.
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
        // The next `## ` heading after the annex heading ends the annex.
        if (index >= start && /^##\s/.test(text)) {
            end = index;
            break;
        }
    }
    return lines.slice(start, end).join("\n");
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
export function parseAuditRows(md) {
    if (exceedsSizeCap(md))
        return [];
    return parseRowsFrom(sliceAnnex(md));
}
/** Parse rows from an already-scoped annex block. */
function parseRowsFrom(block) {
    const rows = [];
    // A markdown table is `header | separator | data…`. Data rows are the rows AFTER the
    // separator; the header row (and any prose before the separator) is skipped so the column
    // labels are never misparsed as a gate row.
    let pastSeparator = false;
    // contentLines skips fenced-block lines (same-char close), so a ~~~ line inside a ``` example
    // cannot leak a fenced table row as a real audit row.
    for (const { text } of contentLines(block)) {
        const m = text.match(TABLE_ROW);
        if (!m)
            continue;
        // m[1] is the content between the outer pipes; split on `|`.
        const cells = (m[1] ?? "").split("|").map((c) => c.trim());
        if (cells.length < 3)
            continue;
        if (isSeparator(cells)) {
            pastSeparator = true;
            continue;
        }
        if (!pastSeparator)
            continue; // header row, not a data row
        const gate = normalizeSlug(cells[0] ?? "");
        if (!gate)
            continue;
        const ranCell = (cells[1] ?? "").toLowerCase();
        const ran = ranCell.trim() === "yes";
        // Evidence is the remainder of the row joined back (cells beyond the 3rd stay in evidence).
        const evidence = cells.slice(2).join(" | ").trim();
        rows.push({ gate, ran, evidence });
    }
    return rows;
}
/**
 * Validate a standing-audit annex. The annex is valid iff every load-bearing gate has at least one
 * row. A gate marked "no" (did not run) is healthy — absence was reported. A gate with no row at
 * all is a violation (silently omitted). Zero rows → every gate is a missing-row violation.
 */
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