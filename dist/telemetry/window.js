export function parseWindow(arg, retentionDays) {
    const table = {
        today: { days: 1, label: "today" },
        "7d": { days: 7, label: "last 7 days" },
        "30d": { days: 30, label: "last 30 days" },
    };
    const base = (arg !== undefined ? table[arg] : undefined) ?? table["7d"];
    const days = Math.max(1, Math.min(base.days, retentionDays));
    return { days, label: base.label };
}
//# sourceMappingURL=window.js.map