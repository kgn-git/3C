export function parseWindow(arg, retentionDays) {
    const table = {
        today: { days: 1, label: "today" },
        "7d": { days: 7, label: "last 7 days" },
        "30d": { days: 30, label: "last 30 days" },
    };
    // Own keys only — `--since` reaches here verbatim, and a plain lookup walks
    // the prototype chain: `--since=constructor` resolved a function and the
    // fallback never fired.
    const base = (arg !== undefined && Object.hasOwn(table, arg) ? table[arg] : undefined) ?? table["7d"];
    const days = Math.max(1, Math.min(base.days, retentionDays));
    return { days, label: base.label };
}
//# sourceMappingURL=window.js.map