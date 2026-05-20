export const SEVERITY_ORDER = ["critical", "high", "medium", "low"];
export function decideOutcome(findings) {
    let block = false;
    let warn = false;
    for (const x of findings) {
        if (x.severity === "critical" || x.severity === "high")
            block = true;
        if (x.severity === "medium")
            warn = true;
    }
    return { block, warn: block || warn };
}
//# sourceMappingURL=severity.js.map