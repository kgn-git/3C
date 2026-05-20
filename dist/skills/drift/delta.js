// #10 AC4: signed per-rule change vs the previous persisted run. Data only,
// no chart — longitudinal visualisation stays L3 (VP-04).
export function computeDelta(previous, current) {
    if (!previous)
        return { byRule: {}, hasPrevious: false };
    const byRule = {};
    const rules = new Set([
        ...Object.keys(previous.byRule),
        ...Object.keys(current.byRule),
    ]);
    for (const r of rules) {
        byRule[r] = (current.byRule[r] ?? 0) - (previous.byRule[r] ?? 0);
    }
    return { byRule, hasPrevious: true };
}
//# sourceMappingURL=delta.js.map