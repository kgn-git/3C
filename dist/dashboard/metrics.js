import { aggregate } from "../telemetry/aggregate.js";
export function dashboardMetrics(records) {
    const base = aggregate(records);
    const total = records.length;
    const corrected = records.filter((r) => r.self_correction_count > 0).length;
    const timeInGatesMs = records.reduce((s, r) => s + r.duration_ms, 0);
    const byDay = new Map();
    for (const r of records) {
        const d = r.timestamp.slice(0, 10);
        const cur = byDay.get(d) ?? { runs: 0, pass: 0 };
        cur.runs++;
        if (r.failure_category === "none")
            cur.pass++;
        byDay.set(d, cur);
    }
    const dailyPassRate = [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, runs: v.runs, passRate: v.pass / v.runs }));
    return {
        ...base,
        selfCorrectionRate: total === 0 ? 0 : corrected / total,
        timeInGatesMs,
        dailyPassRate,
    };
}
//# sourceMappingURL=metrics.js.map