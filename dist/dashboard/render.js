const pct = (n) => `${Math.round(n * 100)}%`;
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// AC1/AC4/AC5: a single self-contained HTML document. Inline CSS only;
// no network refs, no scripts; personal/local wording only.
export function renderDashboardHtml(m, windowLabel) {
    const cats = Object.entries(m.failureCategories)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `<li>${esc(k)}: ${v}</li>`)
        .join("") || "<li>nothing — clean window</li>";
    const trend = m.dailyPassRate
        .map((d) => `<tr><td>${esc(d.date)}</td><td>${d.runs}</td>` +
        `<td><span class="bar" style="width:${Math.round(d.passRate * 100)}%"></span>${pct(d.passRate)}</td></tr>`)
        .join("") || "<tr><td>no data</td></tr>";
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Your local insights — ${esc(windowLabel)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:2rem;max-width:48rem}
.kpi{display:flex;gap:2rem;flex-wrap:wrap;margin:1rem 0}
.kpi div{background:#f4f4f5;padding:1rem;border-radius:.5rem;min-width:9rem}
.kpi b{display:block;font-size:1.6rem}
table{border-collapse:collapse;width:100%}
td{border-bottom:1px solid #e4e4e7;padding:.3rem .5rem}
.bar{display:inline-block;height:.7rem;background:#16a34a;margin-right:.4rem;vertical-align:middle}
small{color:#52525b}
</style></head><body>
<h1>Your local insights</h1>
<p><small>This workspace only · ${esc(windowLabel)} · generated locally, never sent anywhere</small></p>
<div class="kpi">
<div><small>Gate runs</small><b>${m.totalRuns}</b></div>
<div><small>Pass rate</small><b>${pct(m.passRate)}</b></div>
<div><small>Self-correction rate</small><b>${pct(m.selfCorrectionRate)}</b></div>
<div><small>Time in gates</small><b>${(m.timeInGatesMs / 1000).toFixed(1)}s</b></div>
</div>
<h2>Where your flow snagged</h2>
<ul>${cats}</ul>
<h2>Pass-rate trend</h2>
<table><tbody>${trend}</tbody></table>
</body></html>`;
}
//# sourceMappingURL=render.js.map