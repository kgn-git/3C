// The view-model the local dashboard app renders.
//
// Every number here comes from an existing builder — deliveryMetrics,
// dashboardMetrics, readRuns, loadProgress. This module maps their results into
// the shared `Presentation` shape and re-implements no aggregation; a second
// copy of the maths could drift from the first.
//
// Every source is a file under the workspace, and nothing here opens a
// socket: delivery rows come from the handover-issue cache, which is filled
// outside the request path (NFR-SEC-01).
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { readDelivery } from "../handovers/delivery-source.js";
import { describeDelivery } from "./delivery-status.js";
import { CYCLE_LABEL, CYCLE_NOTE, fmtCycle, ISSUE_DELIVERIES_NOTE, NO_ISSUE_DELIVERIES, deliveryMetrics, issueDeliveries } from "./delivery.js";
import { dashboardMetrics } from "./metrics.js";
import { gitIn } from "../memory/git-probe.js";
import { readUsableStore } from "../memory/store-gate.js";
import { loadDeveloperView } from "./views/developer-load.js";
import { loadManagerView } from "./views/manager-load.js";
import { loadTelemetryConfig } from "../telemetry/config.js";
import { parseWindow } from "../telemetry/window.js";
import { readEventsInWindow } from "../telemetry/read.js";
import { readRuns } from "../skills/findings/store.js";
import { presentFindings } from "../skills/findings/present.js";
import { loadProgress } from "../skills/onboard/progress.js";
import { presentOnboarding } from "../skills/onboard/present.js";
import { isSafeUser, onboardingDirLinked } from "../skills/onboard/user-path.js";
/** More developers than any one workspace onboards; the cap exists to bound a planted directory. */
const MAX_ONBOARDING_RECORDS = 500;
const pct = (n) => `${Math.round(n * 100)}%`;
// The meaning line is prose and has to read like prose, not "All 1 violations".
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
// The worst offender in a count map, or null when the map is empty: the gate
// panel turns a distribution into the one sentence a reader needs.
function worst(counts) {
    let top = null;
    for (const [key, count] of Object.entries(counts)) {
        if (top === null || count > top.count)
            top = { key, count };
    }
    return top;
}
function deliveryPanel(src) {
    const said = describeDelivery(src);
    const d = deliveryMetrics(src.scan);
    const n = d.rows.length;
    const summary = n === 0
        ? [NO_ISSUE_DELIVERIES]
        : [
            `${issueDeliveries(n)} across ${plural(src.scan.records.length, "delivery", "deliveries")}`,
            ISSUE_DELIVERIES_NOTE,
            `${CYCLE_LABEL}: ${d.medianCycleMs !== null ? fmtCycle(d.medianCycleMs) : "—"}`,
            CYCLE_NOTE,
            `Follow-ups per delivery: ${d.followUpRatio !== null ? d.followUpRatio.toFixed(1) : "—"}`,
        ];
    const verdicts = Object.entries(d.verdictDistribution)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ");
    if (verdicts !== "")
        summary.push(`Verdicts: ${verdicts}`);
    const results = [said.header, said.status, ...summary, ...said.notes, ...said.unreadable].join("\n");
    const meaning = said.stale
        ? "These rows are from an earlier fetch; the latest one failed."
        : said.unread
            ? "The handover issues could not be read, so an empty view here is not a true zero."
            : said.completeness !== null
                ? said.completeness
                : n === 0
                    ? "No handover issue carries a delivery block yet — this view fills in as work ships."
                    : `Delivery data is complete for all ${plural(src.scan.records.length, "recorded delivery", "recorded deliveries")}.`;
    return { id: "delivery", label: "Delivery", results, meaning, nextSteps: [...said.nextSteps] };
}
function developerPanel(env, source, memory) {
    return loadDeveloperView({ cwd: env.cwd, now: env.now ?? new Date(), source, memory });
}
function managerPanel(env, source, memory) {
    return loadManagerView({ cwd: env.cwd, now: env.now ?? new Date(), source, memory });
}
async function gatesPanel(env) {
    const cfg = await loadTelemetryConfig(env.cwd);
    const win = parseWindow(env.since, cfg.retentionDays);
    if (!cfg.enabled) {
        return {
            id: "gates",
            label: "Gate health",
            results: "Telemetry is disabled.",
            meaning: "Gate health is not being recorded, so there is nothing to summarise — this is a choice, not a fault.",
            nextSteps: [],
        };
    }
    const records = await readEventsInWindow(env.cwd, win.days, env.now ?? new Date());
    if (records.length === 0) {
        return {
            id: "gates",
            label: "Gate health",
            results: `No gate run in the ${win.label}.`,
            meaning: `No gate fired in the ${win.label} — either the window is quiet or no hooks ran.`,
            nextSteps: ["3c doctor   # confirms the hooks are installed"],
        };
    }
    const m = dashboardMetrics(records);
    const results = [
        `${plural(m.totalRuns, "gate run")} in the ${win.label}`,
        `Pass rate: ${pct(m.passRate)}`,
        `Self-correction rate: ${pct(m.selfCorrectionRate)}`,
        `Time in gates: ${(m.timeInGatesMs / 1000).toFixed(1)}s`,
    ].join("\n");
    const top = worst(m.failureCategories);
    const meaning = top === null
        ? `Every gate run passed in the ${win.label}.`
        : `${top.count} of ${m.totalRuns} runs snagged on ${top.key} — the largest single cause.`;
    // No next step: no rationale files ship for a rule to point at, so any offer
    // here would be a dead-end. The diagnosis above stands on its own.
    return {
        id: "gates",
        label: "Gate health",
        results,
        meaning,
        nextSteps: [],
    };
}
// The two panels below delegate their interpretation to the owning skill, so
// the console surface and this panel cannot describe one run differently.
// The panel renders the findings STORE, not a verb: arch-check appends
// layer-boundary runs to it, and an adopter's older history still parses.
async function boundaryPanel(env) {
    const runs = await readRuns(env.cwd);
    return {
        id: "boundary",
        label: "Boundary findings",
        ...presentFindings(runs.at(-1)),
    };
}
async function onboardingPanel(env) {
    const dir = join(env.cwd, `.${resolveBrandSlugSync()}`, "onboarding");
    let names;
    try {
        // Only stems the CLI itself could have written, and never through
        // a link — a linked directory or entry is skipped, not read.
        names = (await onboardingDirLinked(env.cwd))
            ? []
            : (await readdir(dir, { withFileTypes: true }))
                .filter((e) => e.isFile() && e.name.endsWith(".yaml"))
                .map((e) => e.name.slice(0, -".yaml".length))
                .filter(isSafeUser)
                // Bounded (CWE-400): every record is read on every render.
                .slice(0, MAX_ONBOARDING_RECORDS);
    }
    catch {
        names = [];
    }
    // loadProgress is the reader that already handles corrupt/missing state.
    const progress = await Promise.all(names.map((n) => loadProgress(env.cwd, n)));
    return {
        id: "onboarding",
        label: "Onboarding",
        ...presentOnboarding(progress),
    };
}
/** Builds every panel the local dashboard app renders. Performs no network call. */
export async function buildDashboardState(given) {
    // One clock for the whole state, so the cache's freshness and the period edges agree.
    const env = { ...given, now: given.now ?? new Date() };
    const source = await readDelivery(env.cwd, env.now);
    const memory = await readUsableStore(env.cwd, env.git ?? gitIn(env.cwd));
    const panels = await Promise.all([
        deliveryPanel(source),
        developerPanel(env, source, memory),
        managerPanel(env, source, memory),
        gatesPanel(env),
        boundaryPanel(env),
        onboardingPanel(env),
    ]);
    return {
        brand: resolveBrandSlugSync(),
        generatedAt: (env.now ?? new Date()).toISOString(),
        panels,
    };
}
//# sourceMappingURL=state.js.map