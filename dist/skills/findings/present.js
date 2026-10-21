// #394 (was #346, for #342): the findings store's mapping from a run to the
// shared convention. "Skills own interpretation; the presenter owns the
// envelope" — the dashboard boundary panel renders exactly what this returns.
//
// The console rendering of a run lives here too, moved in from the deleted
// `group.ts`: the presenter is its only surviving caller, and the JSON/HTML
// branches died with the `drift analyze` verb that selected them.
/** Directory rows the dashboard panel lists — a summary, not the full map. */
const MAX_DIRECTORIES = 5;
function rows(m) {
    return Object.entries(m)
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `  ${k}: ${n}`)
        .join("\n");
}
function worst(counts) {
    let top = null;
    for (const [key, count] of Object.entries(counts)) {
        if (top === null || count > top.count)
            top = { key, count };
    }
    return top;
}
/** The only rule this version can record. Anything else is pre-#394 history. */
const LIVE_RULE = "layer-boundary";
/** `2026-07-20T00:00:00Z` → `2026-07-20`; anything unparseable renders as-is. */
function day(timestamp) {
    return /^\d{4}-\d{2}-\d{2}/.exec(timestamp)?.[0] ?? timestamp;
}
/**
 * The clean case is interpreted too — a bare zero teaches users to ignore it.
 *
 * Two things this deliberately does NOT do, both found by the #394 board:
 *
 *   - It does not describe every stored run as a boundary finding. Keeping the
 *     on-disk path is what lets an adopter's pre-#394 history survive the
 *     upgrade, and that history is keyed by rules this version cannot produce
 *     (`import-order`, `naming-convention`). Labelling those "boundary
 *     findings" and offering `arch-check except` as the remedy is false in
 *     every clause — the compatibility contract would be met in form and
 *     broken in substance.
 *   - It does not present the newest run as a current verdict. Only a run WITH
 *     violations is ever appended, so a team that fixes its last violation
 *     would otherwise see that violation reported forever. Every line is dated
 *     so a stale run reads as history.
 */
export function presentFindings(latest) {
    if (latest === undefined) {
        return {
            results: "No boundary findings recorded.",
            meaning: "The arch-check gate has not recorded a layer-boundary finding in this workspace yet.",
            nextSteps: ["3c arch-check check"],
        };
    }
    const total = Object.values(latest.byRule).reduce((s, n) => s + n, 0);
    const ruleIds = Object.keys(latest.byRule);
    // Recorded by a check this version no longer runs — see the note above.
    //
    // `source: "scan"` is the tell for a run this version could not have
    // written: only `appendExternalViolations` writes now, and it always sets
    // "external". Keying on the rule ids ALONE missed the empty case — a
    // pre-#394 audit that found nothing has `byRule: {}`, and describing that
    // as "no boundary violation — that run was clean" manufactures a boundary
    // verdict from a run that never evaluated a boundary.
    const legacyOnly = (ruleIds.length > 0 && !ruleIds.includes(LIVE_RULE)) || latest.source === "scan";
    const when = day(latest.timestamp);
    const byDirectory = Object.fromEntries(Object.entries(latest.byDirectory)
        .sort(([, a], [, b]) => b - a)
        .slice(0, MAX_DIRECTORIES));
    const results = [
        `${legacyOnly ? "Recorded findings" : "Boundary findings"}: ${total} violation(s) in the run recorded ${when}` +
            (latest.filesScanned > 0 ? `, ${latest.filesScanned} files scanned` : ""),
        `By rule:`,
        rows(latest.byRule) || "  (none)",
        `By directory:`,
        rows(byDirectory) || "  (none)",
    ].join("\n");
    if (legacyOnly) {
        const named = ruleIds.length > 0 ? ` (${ruleIds.join(", ")})` : "";
        return {
            results,
            meaning: `Recorded by a standards audit this version no longer runs${named}, ` +
                `so this is history rather than a current verdict — it says nothing about ` +
                `your layer boundaries, and nothing here blocks a commit.`,
            nextSteps: ["3c arch-check check"],
        };
    }
    if (total === 0) {
        // Zero violations because nothing was read is not the same news as zero
        // violations because the code is clean, and conflating them is the same
        // false reassurance this presenter exists to remove.
        const meaning = latest.filesScanned === 0
            ? "No files were scanned, so this says nothing about the codebase yet."
            : `No boundary violation in the run recorded ${when} — that run was clean.`;
        return {
            results,
            meaning,
            nextSteps: latest.filesScanned === 0 ? ["3c doctor"] : ["3c arch-check check"],
        };
    }
    const topRule = worst(latest.byRule);
    const topDir = worst(latest.byDirectory);
    const share = topDir === null ? null : Math.round((topDir.count / total) * 100);
    const concentrated = topDir !== null ? `, concentrated in ${topDir.key} (${topDir.count})` : "";
    // The old sentence said the findings were advisory. That was true of the
    // verb that wrote them and is false of the gate that writes them now:
    // arch-check blocks a commit that adds a cross-boundary import.
    const gateSentence = "New violations block at the arch-check gate; fix the dependency direction or file a time-boxed exception.";
    const meaning = topRule !== null && ruleIds.length === 1
        ? `${total === 1 ? "The single violation is" : `All ${total} violations are`} one rule — ${topRule.key}${concentrated}. ${gateSentence}`
        : `${topRule?.count ?? 0} of ${total} violations are ${topRule?.key ?? "one rule"}. ${gateSentence}`;
    const nextSteps = [
        topDir === null || share === null
            ? null
            : `Fix ${topDir.key} first — ${share}% of the total sits there`,
        "3c arch-check check",
    ].filter((s) => s !== null);
    return { results, meaning, nextSteps };
}
//# sourceMappingURL=present.js.map