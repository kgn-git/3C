const pct = (n) => `${Math.round(n * 100)}%`;
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmtCycle = (ms) => {
    if (ms < 3_600_000)
        return `${Math.round(ms / 60_000)}m`;
    if (ms < 48 * 3_600_000)
        return `${(ms / 3_600_000).toFixed(1)}h`;
    return `${(ms / 86_400_000).toFixed(1)}d`;
};
const verdictCell = (r) => {
    const v = r.verdict;
    const level = v?.level;
    if (v === undefined || level === undefined)
        return "";
    const counts = [
        v.blocking !== undefined ? `${v.blocking} blocking` : null,
        v.warnings !== undefined ? `${v.warnings} warnings` : null,
        v.fixed_in_branch !== undefined ? `${v.fixed_in_branch} fixed` : null,
    ].filter((c) => c !== null);
    return counts.length === 0
        ? esc(level)
        : `${esc(level)} <small>(${counts.join(" · ")})</small>`;
};
// #301 AC3/AC4: the issue-centric delivery view — one row per issue, plain
// #N references (no links: the document must stay free of external refs).
function deliverySection(d) {
    const rows = d.rows
        .map((r) => `<tr><td>#${r.issue}</td><td>${esc(r.title ?? "")}</td>` +
        `<td>${verdictCell(r)}</td>` +
        `<td>${r.cycleMs !== undefined ? fmtCycle(r.cycleMs) : ""}</td>` +
        `<td>${r.loc ? `+${r.loc.added ?? 0} / −${r.loc.removed ?? 0}` : ""}</td>` +
        `<td>${r.followUps || ""}</td></tr>`)
        .join("");
    const weeks = d.shippedPerWeek
        .map((w) => `<tr><td>${esc(w.week)}</td><td>${w.count}</td></tr>`)
        .join("");
    const verdicts = Object.entries(d.verdictDistribution)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `${esc(k)}: ${v}`)
        .join(" · ");
    const notes = [
        d.legacy > 0 ? `${d.legacy} earlier handovers without delivery data` : null,
        d.malformed > 0
            ? `${d.malformed} handover${d.malformed === 1 ? "" : "s"} with malformed frontmatter (warning)`
            : null,
    ].filter((n) => n !== null);
    return `<h2>Delivery</h2>
<p><small>all deliveries on record</small></p>
<div class="kpi">
<div><small>Issues shipped</small><b>${d.rows.length}</b></div>
<div><small>Median cycle</small><b>${d.medianCycleMs !== null ? fmtCycle(d.medianCycleMs) : "—"}</b></div>
<div><small>Follow-ups per delivery</small><b>${d.followUpRatio !== null ? d.followUpRatio.toFixed(1) : "—"}</b></div>
<div><small>Verdicts</small><b class="small">${verdicts || "—"}</b></div>
</div>
<table><thead><tr><th>Issue</th><th>Title</th><th>Board verdict</th><th>Cycle</th><th>LOC ±</th><th>Follow-ups</th></tr></thead>
<tbody>${rows}</tbody></table>
<h3>Shipped per week</h3>
<table><tbody>${weeks || "<tr><td>no dated deliveries</td></tr>"}</tbody></table>
${notes.length > 0 ? `<p><small>${notes.join(" · ")}</small></p>` : ""}`;
}
// #180: telemetry gate metrics — demoted to a secondary section (#301 AC5).
function gateSection(m, windowLabel) {
    const cats = Object.entries(m.failureCategories)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `<li>${esc(k)}: ${v}</li>`)
        .join("") || "<li>nothing — clean window</li>";
    const trend = m.dailyPassRate
        .map((d) => `<tr><td>${esc(d.date)}</td><td>${d.runs}</td>` +
        `<td><span class="bar" style="width:${Math.round(d.passRate * 100)}%"></span>${pct(d.passRate)}</td></tr>`)
        .join("") || "<tr><td>no data</td></tr>";
    return `<h2>Gate health</h2>
<p><small>${esc(windowLabel)}</small></p>
<div class="kpi">
<div><small>Gate runs</small><b>${m.totalRuns}</b></div>
<div><small>Pass rate</small><b>${pct(m.passRate)}</b></div>
<div><small>Self-correction rate</small><b>${pct(m.selfCorrectionRate)}</b></div>
<div><small>Time in gates</small><b>${(m.timeInGatesMs / 1000).toFixed(1)}s</b></div>
</div>
<h3>Where your flow snagged</h3>
<ul>${cats}</ul>
<h3>Pass-rate trend</h3>
<table><tbody>${trend}</tbody></table>`;
}
// AC1/AC4/AC5 (#180) preserved: a single self-contained HTML document.
// Inline CSS only; no network refs, no scripts; personal/local wording only.
export function renderDashboardHtml(delivery, gates, windowLabel) {
    const sections = [
        delivery !== null ? deliverySection(delivery) : null,
        gates !== null ? gateSection(gates, windowLabel) : null,
    ].filter((s) => s !== null);
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Your local insights — ${esc(windowLabel)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:2rem;max-width:60rem}
.kpi{display:flex;gap:2rem;flex-wrap:wrap;margin:1rem 0}
.kpi div{background:#f4f4f5;padding:1rem;border-radius:.5rem;min-width:9rem}
.kpi b{display:block;font-size:1.6rem}
.kpi b.small{font-size:1rem}
table{border-collapse:collapse;width:100%}
th{text-align:left;padding:.3rem .5rem;border-bottom:2px solid #d4d4d8}
td{border-bottom:1px solid #e4e4e7;padding:.3rem .5rem}
.bar{display:inline-block;height:.7rem;background:#16a34a;margin-right:.4rem;vertical-align:middle}
small{color:#52525b}
</style></head><body>
<h1>Your local insights</h1>
<p><small>This workspace only · generated locally, never sent anywhere</small></p>
${sections.join("\n")}
</body></html>`;
}
//# sourceMappingURL=render.js.map