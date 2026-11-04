import { CYCLE_LABEL, CYCLE_NOTE, fmtCycle, ISSUE_DELIVERIES_LABEL, ISSUE_DELIVERIES_NOTE, ISSUE_DELIVERIES_PER_WEEK, } from "./delivery.js";
import { esc } from "./html-escape.js";
import { developerSectionHtml } from "./views/developer-html.js";
import { managerSectionHtml } from "./views/manager-html.js";
const pct = (n) => `${Math.round(n * 100)}%`;
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
// The handovers left out of the numbers, shared by the full section and by the
// source-only one a workspace gets when no handover could be read as a delivery.
function unreadableBlock(source) {
    if (source.unreadable.length === 0 && source.completeness === null)
        return "";
    return `<h3>Handovers not in these numbers</h3>
${source.completeness === null ? "" : `<p>${esc(source.completeness)}</p>`}
<ul>${source.unreadable.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`;
}
function unreadableOnlySection(source) {
    return `<h2>Delivery</h2>
<p><small>${[source.header, source.status, ...source.notes].map(esc).join(" · ")}</small></p>
${unreadableBlock(source)}`;
}
// The issue-centric delivery view — one row per issue, plain
// #N references (no links: the document must stay free of external refs).
function deliverySection(d, source) {
    const rows = d.rows
        .map((r) => `<tr><td>#${r.issue}</td><td>${esc(r.title ?? "")}</td>` +
        `<td>${verdictCell(r)}</td>` +
        `<td>${r.cycleMs !== undefined ? fmtCycle(r.cycleMs) : ""}</td>` +
        `<td>${r.loc ? `+${r.loc.added ?? 0} / −${r.loc.removed ?? 0}` : ""}</td>` +
        `<td>${r.followUps || ""}</td></tr>`)
        .join("");
    const weeks = d.issueDeliveriesPerWeek
        .map((w) => `<tr><td>${esc(w.week)}</td><td>${w.count}</td></tr>`)
        .join("");
    const verdicts = Object.entries(d.verdictDistribution)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `${esc(k)}: ${v}`)
        .join(" · ");
    // With a source, its notes and unreadable list already say this once.
    const notes = source !== null
        ? []
        : [
            d.legacy > 0 ? `${d.legacy} earlier handovers without delivery data` : null,
            d.malformed > 0
                ? `${d.malformed} handover${d.malformed === 1 ? "" : "s"} with malformed frontmatter (warning)`
                : null,
        ].filter((n) => n !== null);
    const unreadable = source === null ? "" : unreadableBlock(source);
    const origin = source === null ? "all deliveries on record" : [source.header, source.status, ...source.notes].map(esc).join(" · ");
    return `<h2>Delivery</h2>
<p><small>${origin}</small></p>
<div class="kpi">
<div><small>${ISSUE_DELIVERIES_LABEL}</small><b>${d.rows.length}</b></div>
<div><small>${CYCLE_LABEL}</small><b>${d.medianCycleMs !== null ? fmtCycle(d.medianCycleMs) : "—"}</b></div>
<div><small>Follow-ups per delivery</small><b>${d.followUpRatio !== null ? d.followUpRatio.toFixed(1) : "—"}</b></div>
<div><small>Verdicts</small><b class="small">${verdicts || "—"}</b></div>
</div>
<div class="scroll" role="region" aria-label="Delivery rows" tabindex="0"><table><thead><tr><th>Issue</th><th>Title</th><th>Board verdict</th><th>${CYCLE_LABEL}</th><th>LOC ±</th><th>Follow-ups</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<p><small>${CYCLE_NOTE} ${ISSUE_DELIVERIES_NOTE}</small></p>
<h3>${ISSUE_DELIVERIES_PER_WEEK}</h3>
<div class="scroll" role="region" aria-label="Issue deliveries per week" tabindex="0"><table><tbody>${weeks || "<tr><td>no dated deliveries</td></tr>"}</tbody></table></div>
${notes.length > 0 ? `<p><small>${notes.join(" · ")}</small></p>` : ""}
${unreadable}`;
}
// Telemetry gate metrics — a secondary section.
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
<div class="scroll" role="region" aria-label="Pass-rate trend" tabindex="0"><table><tbody>${trend}</tbody></table></div>`;
}
// A single self-contained HTML document.
// Inline CSS only; no network refs, no scripts; personal/local wording only.
export function renderDashboardHtml(delivery, gates, windowLabel, source = null, developer = null, manager = null) {
    const parts = [
        {
            id: "delivery",
            title: "Delivery",
            html: delivery !== null
                ? deliverySection(delivery, source)
                : source !== null && unreadableBlock(source) !== ""
                    ? unreadableOnlySection(source)
                    : null,
        },
        { id: "developer", title: "Developer", html: developer !== null ? developerSectionHtml(developer) : null },
        { id: "manager", title: "Manager (team level)", html: manager !== null ? managerSectionHtml(manager) : null },
        { id: "gates", title: "Gate health", html: gates !== null ? gateSection(gates, windowLabel) : null },
    ];
    const shown = parts.filter((p) => p.html !== null);
    // A page of three sections or more has a list of them, because the delivery table can run to hundreds of rows.
    const nav = shown.length < 3 ? "" : `<nav aria-label="On this page"><ul>${shown.map((p) => `<li><a href="#${p.id}">${esc(p.title)}</a></li>`).join("")}</ul></nav>`;
    const sections = shown.map((p) => `<section id="${p.id}">\n${p.html}\n</section>`);
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>Your local insights — ${esc(windowLabel)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:2rem;max-width:60rem}
.kpi{display:flex;gap:2rem;flex-wrap:wrap;margin:1rem 0}
.kpi div{background:#f4f4f5;padding:1rem;border-radius:.5rem;min-width:9rem}
.kpi b{display:block;font-size:1.6rem}
.kpi b.small{font-size:1rem}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%}
@media (max-width:40rem){body{margin:1rem}}
th{text-align:left;padding:.3rem .5rem;border-bottom:2px solid #d4d4d8}
td{border-bottom:1px solid #e4e4e7;padding:.3rem .5rem}
.bar{display:inline-block;height:.7rem;background:#16a34a;margin-right:.4rem;vertical-align:middle}
small{color:#52525b}
pre{white-space:pre-wrap;background:#f4f4f5;padding:.6rem;border-radius:.4rem}
</style></head><body>
<main>
<h1>Your local insights</h1>
<p><small>This workspace only · generated locally, never sent anywhere</small></p>
${nav}
${sections.join("\n")}
</main>
</body></html>`;
}
//# sourceMappingURL=render.js.map