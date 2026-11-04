import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NETWORK_IDENTIFIER_TYPES, scanSecrets } from "../validate/secrets.js";
import { findingId, matchDigest } from "./findings.js";
// Network identifiers (NETWORK_IDENTIFIER_TYPES) warn (`medium`) rather than block, because blocking would train
// adopters to blanket-suppress.
//
// A Google API key is meant to sit in front-end code, so it warns too. Unlike a
// network identifier it is real wherever it appears, including a bundle.
const WARN_ONLY_TYPES = new Set([
    ...NETWORK_IDENTIFIER_TYPES,
    "google-api-key",
]);
const severityFor = (type) => WARN_ONLY_TYPES.has(type) ? "medium" : "high";
/** CWE-770: bound the finding COLLECTION, not only the bytes read per file. */
export const MAX_FINDINGS_PER_FILE = 25;
// Dotted numbers here are coordinates and hashes, not addresses: skip only the
// network-identifier detectors, since a credential in a `.map` or lock file is real.
const GENERATED_EXTENSIONS = [".svg", ".lock", ".map", ".min.js"];
const isGenerated = (rel) => {
    const lower = rel.toLowerCase();
    return GENERATED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};
/** 1-based line of each offset, CRLF-safe: lines are counted by `\n`. */
function lineOf(text) {
    const starts = [];
    for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1))
        starts.push(i);
    return (offset) => {
        let lo = 0;
        let hi = starts.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (starts[mid] < offset)
                lo = mid + 1;
            else
                hi = mid;
        }
        return lo + 1;
    };
}
export const UNREADABLE_RULE = "scan-unreadable";
export const MISSING_RULE = "scan-missing";
const CLOSE_OR_FIX = { why: "its permissions refuse the read, or another program has it open", next: "fix its permissions or close the program that has it open" };
const IN_USE = { why: "another program has it open", next: "close the program that has it open" };
const UNREAD = {
    EISDIR: { why: "it is a folder, not a file", next: "take it out of the change or commit a file in its place" },
    EACCES: CLOSE_OR_FIX,
    EPERM: CLOSE_OR_FIX,
    EBUSY: IN_USE,
    ETXTBSY: IN_USE,
};
const OTHER = { why: "the read failed", next: "check that it opens in an editor" };
/**
 * A file the gate could not read is not a file it found clean, so it blocks. One that is gone is only noted: the
 * file set has already kept back a deleted file whose staged content still counts, so what reaches here is a file
 * that vanished between the listing and the read.
 */
export function unreadFinding(rel, code) {
    if (code === "ENOENT") {
        return {
            id: findingId(MISSING_RULE, rel, "missing"),
            severity: "low",
            ruleId: MISSING_RULE,
            file: rel,
            line: 0,
            detail: "no longer on disk, so it was not scanned",
        };
    }
    const { why, next } = typeof code === "string" && Object.hasOwn(UNREAD, code) ? UNREAD[code] : OTHER;
    return {
        id: findingId(UNREADABLE_RULE, rel, "unreadable"),
        severity: "high",
        ruleId: UNREADABLE_RULE,
        file: rel,
        line: 0,
        detail: `not scanned, because ${why}; ${next}, then run the scan again`,
    };
}
/** The findings for one text: each credential, with the cap that keeps every blocking one. `note` ends each detail. */
function secretFindings(rel, text, lineAt, note) {
    const out = [];
    const all = scanSecrets(text).hits;
    const hits = isGenerated(rel) ? all.filter((h) => !NETWORK_IDENTIFIER_TYPES.has(h.type)) : all;
    // CWE-770 cap, elided with a stated count. Partition before truncating:
    // scanSecrets emits in detector order, so a severity-blind slice lets
    // warn-only hits displace credentials. The cap never decides the verdict:
    // every blocking hit is kept. Each tier is sorted into reading order.
    const byOffset = (a, b) => a.index - b.index;
    const blocking = hits.filter((h) => severityFor(h.type) !== "medium").sort(byOffset);
    const warnOnly = hits.filter((h) => severityFor(h.type) === "medium").sort(byOffset);
    const keptWarn = warnOnly.slice(0, Math.max(0, MAX_FINDINGS_PER_FILE - blocking.length));
    const shown = [...blocking, ...keptWarn];
    for (const h of shown) {
        const ruleId = `secret:${h.type}`;
        out.push({
            // Keyed on the hashed secret, not its line, so the id survives edits.
            id: findingId(ruleId, rel, matchDigest(h.match)),
            severity: severityFor(h.type),
            ruleId,
            file: rel,
            line: lineAt(h.index),
            detail: `possible ${h.type} secret (${h.redacted})${note}`,
        });
    }
    if (hits.length > shown.length) {
        // `medium` holds because the partition keeps every blocking hit.
        out.push({
            id: findingId("scan-truncated", rel, "truncated"),
            severity: "medium",
            ruleId: "scan-truncated",
            file: rel,
            line: 0,
            detail: `${hits.length} matches in this file; ${shown.length} listed, ` +
                `${hits.length - shown.length} lower-severity matches elided`,
        });
    }
    return out;
}
// A line that no detector matches, put where added lines are not neighbours in the file.
const GAP = String.fromCharCode(0);
/**
 * The added lines of one file as the text they form, and a map from an offset in it to the line number it came from.
 * A gap in the line numbers is a line holding a NUL, which no detector matches, so nothing matches across a gap.
 */
function stagedText(lines) {
    const rows = [];
    for (const line of lines) {
        const last = rows.at(-1);
        if (last !== undefined && last.no !== 0 && last.no + 1 !== line.no)
            rows.push({ no: 0, text: GAP });
        rows.push(line);
    }
    const text = rows.map((l) => l.text).join("\n");
    const inText = lineOf(text);
    return { text, lineAt: (offset) => rows[inText(offset) - 1]?.no ?? 0 };
}
// Findings carry only the redacted form, never the raw match or file content.
export const defaultLocalScanner = {
    async scan({ workspaceDir, changedFiles, staged = [] }) {
        const out = [];
        for (const rel of changedFiles) {
            let text;
            try {
                text = await readFile(join(workspaceDir, rel), "utf8");
            }
            catch (err) {
                out.push(unreadFinding(rel, err.code));
                continue;
            }
            out.push(...secretFindings(rel, text, lineOf(text), ""));
        }
        // The same credential in the staged copy and in the folder has one id, so it is reported once, as the folder's.
        const seen = new Set(out.map((f) => f.id));
        for (const { file, lines } of staged) {
            const { text, lineAt } = stagedText(lines);
            for (const f of secretFindings(file, text, lineAt, " in the staged change")) {
                if (seen.has(f.id))
                    continue;
                seen.add(f.id);
                out.push(f);
            }
        }
        return out;
    },
};
//# sourceMappingURL=scanner.js.map