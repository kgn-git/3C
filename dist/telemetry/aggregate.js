export function aggregate(records) {
    const total = records.length;
    if (total === 0) {
        return { totalRuns: 0, passRate: 0, failureCategories: {}, commonPatterns: [] };
    }
    let pass = 0;
    const cats = {};
    const pat = new Map();
    for (const r of records) {
        if (r.failure_category === "none") {
            pass++;
            continue;
        }
        cats[r.failure_category] = (cats[r.failure_category] ?? 0) + 1;
        const k = `${r.hook_id}|${r.failure_category}`;
        const e = pat.get(k) ??
            { hook_id: r.hook_id, failure_category: r.failure_category, count: 0 };
        e.count++;
        pat.set(k, e);
    }
    return {
        totalRuns: total,
        passRate: pass / total,
        failureCategories: cats,
        commonPatterns: [...pat.values()].sort((a, b) => b.count - a.count),
    };
}
//# sourceMappingURL=aggregate.js.map