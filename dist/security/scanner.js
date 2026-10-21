import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { scanSecrets } from "../validate/secrets.js";
import { findingId, matchDigest } from "./findings.js";
// #408 board: measured on this repository at `--base=HEAD~40`, the gate produced
// 425 blocking findings and ZERO true positives — 416 of them `public-ip`
// matching SVG path coordinates in one generated diagram, the rest `.local`
// FILENAMES (`CLAUDE.local.md`, `settings.local.json`) read as hostnames. Those
// two detectors were harmless while the gate scanned nothing; making it scan
// the real file set is what exposes them, so the exposure is this change's to
// answer.
//
// They still fire and are still reported — what counts as a secret is unchanged
// and out of scope here. They report at `medium`, which `decideOutcome` treats
// as warn rather than block, so a credential still blocks and a coordinate does
// not. Blocking on all of them would train adopters to blanket-suppress, and a
// suppression ledger full of false accepted-risk claims is worse than the
// vacuous gate this issue replaced.
// Typed against SecretType, not `string`: a rename in secrets.ts must fail the
// BUILD. Left as ReadonlySet<string> it would compile clean and silently
// re-promote a demoted class — or, worse, silently demote a credential class.
const WARN_ONLY_TYPES = new Set([
    "public-ip",
    "private-ip",
    "internal-hostname",
]);
const severityFor = (type) => WARN_ONLY_TYPES.has(type) ? "medium" : "high";
/** CWE-770: bound the finding COLLECTION, not only the bytes read per file. */
export const MAX_FINDINGS_PER_FILE = 25;
// #413 AC3: generated or machine-written files whose dotted numbers and names
// are coordinates, hashes and identifiers, not network addresses — one SVG
// produced 416 `public-ip` findings. Only the NETWORK-IDENTIFIER detectors are
// skipped here; credential detectors still run (a token in a `.map` or a lock
// file is real), and the file still counts as scanned.
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
// AC1/AC6: read each changed file locally, run the shipped secret scanner,
// and surface ONLY the redacted form — never the raw match or file content.
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
            // CWE-770: one generated SVG produced 416 findings in a single run, each
            // a heap object plus a formatted line joined into one message string.
            // Truncate with a stated count — an elision that says so keeps the
            // honesty property this gate is built around; a silent one does not.
            //
            // PARTITION BEFORE TRUNCATING. A flat `hits.slice(0, N)` is severity-BLIND,
            // and `scanSecrets` emits in detector order — aws, github-pat, jwt,
            // internal-hostname, stripe-key, pem-block, db-connection-string. Since
            // `internal-hostname` is warn-only and sits AHEAD of three credential
            // detectors, 25 `.local` hostnames in one file (a k8s manifest, an ansible
            // inventory) displaced every stripe key, PEM block and connection string
            // in that same file, leaving a `medium` note and exit 0. That is this
            // issue's own defect — a verdict reported over content that was read and
            // not evaluated — reintroduced by its own fix. The cap may never decide
            // the verdict: blocking hits are all kept, and only the warn-only tail is
            // bounded.
            // Within each tier, in reading order (scanSecrets emits in detector order).
            const byOffset = (a, b) => a.index - b.index;
            const blocking = hits.filter((h) => severityFor(h.type) !== "medium").sort(byOffset);
            const warnOnly = hits.filter((h) => severityFor(h.type) === "medium").sort(byOffset);
            const keptWarn = warnOnly.slice(0, Math.max(0, MAX_FINDINGS_PER_FILE - blocking.length));
            const shown = [...blocking, ...keptWarn];
            for (const h of shown) {
                const ruleId = `secret:${h.type}`;
                out.push({
                    // #413: keyed on the secret itself (hashed), never on its line or
                    // its ordinal — see findingId.
                    id: findingId(ruleId, rel, matchDigest(h.match)),
                    severity: severityFor(h.type),
                    ruleId,
                    file: rel,
                    line: line(h.index),
                    detail: `possible ${h.type} secret (${h.redacted})`,
                });
            }
            if (hits.length > shown.length) {
                // `medium` is correct BY CONSTRUCTION, not by assumption: the partition
                // above keeps every blocking hit, so everything elided here is warn-only.
                // If that ever stops being true this note would be understating a
                // blocking finding, which is why the test below asserts a credential
                // survives past the cap rather than asserting this severity.
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