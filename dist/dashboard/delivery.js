// One name and one caveat for the merged − started figure, so the page and the
// panel cannot call it two things. It measures elapsed time, not effort.
export const CYCLE_LABEL = "Branch open to merge";
export const CYCLE_NOTE = "Time from branch opened to merged. It is not effort.";
// The count of rows, named for what a row is: one issue in one delivery, so an issue delivered twice is two.
export const ISSUE_DELIVERIES_LABEL = "Issue deliveries";
export const ISSUE_DELIVERIES_PER_WEEK = "Issue deliveries per week";
export const ISSUE_DELIVERIES_NOTE = "One for each issue a delivery closed. An issue delivered twice counts twice, and a delivery that closed three issues counts three.";
export const NO_ISSUE_DELIVERIES = "No issue deliveries on record.";
export const issueDeliveries = (n) => n + (n === 1 ? " issue delivery" : " issue deliveries");
/** A span of time as minutes, hours or days, whichever reads best. */
export const fmtCycle = (ms) => {
    if (ms < 3_600_000)
        return `${Math.round(ms / 60_000)}m`;
    if (ms < 48 * 3_600_000)
        return `${(ms / 3_600_000).toFixed(1)}h`;
    return `${(ms / 86_400_000).toFixed(1)}d`;
};
// Cycle time = merged − started; absent (never zero) when either is missing
// or the timestamps are out of order — a negative duration must not reach
// the rows or the median.
export function cycleMs(r) {
    if (r.started === undefined || r.merged === undefined)
        return undefined;
    const ms = Date.parse(r.merged) - Date.parse(r.started);
    return ms < 0 ? undefined : ms;
}
// ISO-8601 week label (e.g. "2026-W24"), computed in UTC via the standard
// shift-to-Thursday construction.
function isoWeek(iso) {
    const d = new Date(iso);
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
    const week = Math.ceil(((t.getTime() - yearStart) / 86_400_000 + 1) / 7);
    return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
export function median(values) {
    if (values.length === 0)
        return null;
    const s = [...values].sort((a, b) => a - b);
    const mid = s.length / 2;
    return s.length % 2 === 1 ? s[Math.floor(mid)] : (s[mid - 1] + s[mid]) / 2;
}
// Grain: rows and issue-deliveries-per-week are issue-grained (a multi-issue
// delivery counts once per issue that week); median cycle, verdict distribution, and the
// follow-up ratio are delivery(record)-grained — one cycle, one verdict, one
// set of follow-ups per delivery regardless of how many issues it closed.
export function deliveryMetrics(scan) {
    // Newest first by merged; undated records after all dated ones; handover-N
    // descending as the tiebreak (normative ordering from the issue spec).
    const ordered = [...scan.records].sort((a, b) => {
        if (a.merged !== undefined && b.merged !== undefined) {
            return Date.parse(b.merged) - Date.parse(a.merged) || b.handover - a.handover;
        }
        if (a.merged !== undefined)
            return -1;
        if (b.merged !== undefined)
            return 1;
        return b.handover - a.handover;
    });
    const rows = ordered.flatMap((r) => r.issues.map((issue) => ({
        issue,
        handover: r.handover,
        title: r.title,
        pr: r.pr,
        merged: r.merged,
        cycleMs: cycleMs(r),
        verdict: r.verdict,
        loc: r.loc,
        followUps: r.follow_ups.length,
    })));
    const byWeek = new Map();
    for (const row of rows) {
        if (row.merged === undefined)
            continue;
        const week = isoWeek(row.merged);
        byWeek.set(week, (byWeek.get(week) ?? 0) + 1);
    }
    const issueDeliveriesPerWeek = [...byWeek.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, count]) => ({ week, count }));
    // No prototype, for callers that build records without the validator's
    // level allow-list: `constructor` or `__proto__` stays an ordinary key.
    const verdictDistribution = Object.create(null);
    for (const r of scan.records) {
        const level = r.verdict?.level;
        if (level === undefined)
            continue;
        verdictDistribution[level] = (verdictDistribution[level] ?? 0) + 1;
    }
    const cycles = scan.records
        .map(cycleMs)
        .filter((v) => v !== undefined);
    const followUps = scan.records.reduce((s, r) => s + r.follow_ups.length, 0);
    return {
        rows,
        issueDeliveriesPerWeek,
        medianCycleMs: median(cycles),
        verdictDistribution,
        followUpRatio: scan.records.length === 0 ? null : followUps / scan.records.length,
        legacy: scan.legacy,
        malformed: scan.malformed,
    };
}
//# sourceMappingURL=delivery.js.map