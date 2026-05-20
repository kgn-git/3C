import { findingId } from "./findings.js";
const ADDED_DEP_RE = /^\+\s*"([^"]+)"\s*:\s*"[^"]+"\s*,?\s*$/;
export function addedDependencies(diffText) {
    let inPkg = false;
    const out = new Set();
    for (const line of diffText.split("\n")) {
        if (line.startsWith("+++ b/")) {
            inPkg = line.endsWith("/package.json") || line === "+++ b/package.json";
            continue;
        }
        if (!inPkg)
            continue;
        const m = ADDED_DEP_RE.exec(line);
        if (m && m[1] !== undefined)
            out.add(m[1]);
    }
    return [...out];
}
export function checkDeps(deps, advisory) {
    const out = [];
    for (const dep of deps) {
        const adv = advisory[dep];
        if (!adv)
            continue;
        out.push({
            id: findingId("dep-cve", "package.json", 0),
            severity: adv.severity,
            ruleId: "dep-cve",
            file: "package.json",
            line: 0,
            detail: `dependency "${dep}" has ${adv.cve} (${adv.severity})`,
        });
    }
    return out;
}
//# sourceMappingURL=deps.js.map