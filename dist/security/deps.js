import { findingId } from "./findings.js";
export function checkDeps(deps, advisory) {
    const out = [];
    for (const dep of deps) {
        // `advisory[dep]` alone walks the prototype chain: a package named
        // `constructor` would read Object.prototype.constructor as an advisory.
        if (!Object.hasOwn(advisory, dep))
            continue;
        const adv = advisory[dep];
        out.push({
            // Per package AND advisory, so suppressing one never hides another.
            id: findingId("dep-cve", "package.json", `${dep}|${adv.cve}`),
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