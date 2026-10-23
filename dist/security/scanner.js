import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { scanSecrets } from "../validate/secrets.js";
import { findingId, matchDigest } from "./findings.js";
// Network-identifier detectors misfire on SVG coordinates and `.local`
// filenames; they warn (`medium`) rather than block, because blocking would
// train adopters to blanket-suppress. Typed as SecretType so a rename in
// secrets.ts fails the build instead of silently re-classing a type.
const WARN_ONLY_TYPES = new Set([
    "public-ip",
    "private-ip",
    "internal-hostname",
]);
const severityFor = (type) => WARN_ONLY_TYPES.has(type) ? "medium" : "high";
/** CWE-770: bound the finding COLLECTION, not only the bytes read per file. */
export const MAX_FINDINGS_PER_FILE = 25;
// Dotted numbers here are coordinates and hashes, not addresses: skip only the
// warn-only detectors, since a credential in a `.map` or lock file is real.
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
// Findings carry only the redacted form, never the raw match or file content.
export const defaultLocalScanner = {
    async scan({ workspaceDir, changedFiles }) {
        const out = [];
        for (const rel of changedFiles) {
            let text;
            try {
                text = await readFile(join(workspaceDir, rel), "utf8");
            }
            catch {
                continue;
            }
            const all = scanSecrets(text).hits;
            const hits = isGenerated(rel) ? all.filter((h) => !WARN_ONLY_TYPES.has(h.type)) : all;
            const line = lineOf(text);
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
                    line: line(h.index),
                    detail: `possible ${h.type} secret (${h.redacted})`,
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
        }
        return out;
    },
};
//# sourceMappingURL=scanner.js.map