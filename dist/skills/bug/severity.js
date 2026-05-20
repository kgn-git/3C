export const SEVERITIES = ["critical", "high", "medium", "low"];
export function severityGuide() {
    return [
        "Choose severity by team criteria:",
        "- impact: how badly is the user/system affected?",
        "- frequency: how often does it happen?",
        "- affected users: how many are hit?",
        "critical = severe + frequent + many; low = minor + rare + few.",
    ].join("\n");
}
export function normalizeSeverity(input) {
    const v = (input ?? "").trim().toLowerCase();
    return SEVERITIES.includes(v)
        ? v
        : "medium";
}
//# sourceMappingURL=severity.js.map