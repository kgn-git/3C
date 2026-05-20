// #10 AC1/AC2: aggregate violations by rule + directory; render JSON/HTML/console.
import { dirOf } from "./scan.js";
export function groupReport(violations, filesScanned) {
    const byRule = {};
    const byDirectory = {};
    for (const v of violations) {
        byRule[v.ruleId] = (byRule[v.ruleId] ?? 0) + 1;
        const d = dirOf(v.file);
        byDirectory[d] = (byDirectory[d] ?? 0) + 1;
    }
    return {
        filesScanned,
        total: violations.length,
        byRule,
        byDirectory,
        violations,
    };
}
function rows(m) {
    return Object.entries(m)
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `  ${k}: ${n}`)
        .join("\n");
}
export function formatReport(r, format) {
    if (format === "json")
        return JSON.stringify(r, null, 2);
    if (format === "html") {
        const tr = (m) => Object.entries(m)
            .map(([k, n]) => `<tr><td>${k}</td><td>${n}</td></tr>`)
            .join("");
        return [
            `<h1>Standards Drift Report</h1>`,
            `<p>Files scanned: ${r.filesScanned} — Total violations: ${r.total}</p>`,
            `<h2>By rule</h2><table>${tr(r.byRule)}</table>`,
            `<h2>By directory</h2><table>${tr(r.byDirectory)}</table>`,
        ].join("\n");
    }
    return [
        `Standards drift: ${r.total} violation(s), ${r.filesScanned} files scanned`,
        `By rule:`,
        rows(r.byRule) || "  (none)",
        `By directory:`,
        rows(r.byDirectory) || "  (none)",
    ].join("\n");
}
//# sourceMappingURL=group.js.map