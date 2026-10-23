import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { deliveryMetrics } from "../../dashboard/delivery.js";
import { defaultSourceDeps, loadDelivery } from "../../dashboard/delivery-source.js";
import { describeDelivery } from "../../dashboard/delivery-status.js";
import { dashboardMetrics } from "../../dashboard/metrics.js";
import { renderDashboardHtml } from "../../dashboard/render.js";
import { DEFAULT_PORT, startDashboardServer } from "../../dashboard/server.js";
import { renderConsole } from "../../output/index.js";
import { loadTelemetryConfig } from "../../telemetry/config.js";
import { readEventsInWindow } from "../../telemetry/read.js";
import { parseWindow } from "../../telemetry/window.js";
/** Parses `--serve`, `--port <n>`/`--port=<n>` and `--since <w>`/`--since=<w>`. */
function parseServeFlags(argv) {
    let serve = false;
    let port;
    let since;
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--serve")
            serve = true;
        else if (a === "--port")
            port = argv[i + 1] ?? "";
        else if (a?.startsWith("--port="))
            port = a.slice("--port=".length);
        else if (a === "--since")
            since = argv[i + 1];
        else if (a?.startsWith("--since="))
            since = a.slice("--since=".length);
    }
    return {
        serve,
        ...(port !== undefined ? { port } : {}),
        ...(since !== undefined ? { since } : {}),
    };
}
/**
 * Validates a `--port` value before any bind is attempted (AC3). Fails closed:
 * anything that is not a whole number in range is rejected, including the
 * partially-numeric strings `parseInt` would happily accept.
 */
function parsePort(raw) {
    if (raw === undefined)
        return DEFAULT_PORT;
    if (!/^\d+$/.test(raw))
        return null;
    const n = Number(raw);
    // 0 is permitted: it asks the OS for an ephemeral port, which is how the
    // tests bind without racing a fixed one.
    return n >= 0 && n <= 65535 ? n : null;
}
async function serveDashboard(argv, env, log) {
    const { port: rawPort, since } = parseServeFlags(argv);
    const port = parsePort(rawPort);
    if (port === null) {
        log(`Invalid --port "${rawPort}". Give a whole number between 0 and 65535.`);
        return 1;
    }
    let server;
    try {
        server = await startDashboardServer({
            cwd: env.cwd,
            port,
            ...(env.assetDir !== undefined ? { assetDir: env.assetDir } : {}),
            ...(env.delivery !== undefined ? { delivery: env.delivery } : {}),
            ...(since !== undefined ? { since } : {}),
            log,
        });
    }
    catch (err) {
        // The server already shaped a caller-safe message (A10) — no errno, no stack.
        log(err instanceof Error ? err.message : "The dashboard server could not start.");
        return 1;
    }
    log(renderConsole({
        results: `Dashboard app running at ${server.url}`,
        meaning: "Bound to loopback and restricted to local Host headers, so a remote page cannot read it. The delivery view reads this repository's handover issues from GitHub through gh; telemetry and everything else stay on this workstation.",
        nextSteps: [
            `Open ${server.url}`,
            "Press Ctrl-C to stop",
        ],
    }));
    try {
        await (env.waitForShutdown ?? waitForSigint)();
    }
    finally {
        await server.close();
    }
    return 0;
}
/** Default shutdown signal: the first SIGINT after the server starts. */
function waitForSigint() {
    return new Promise((resolve) => {
        const onSignal = () => {
            process.removeListener("SIGINT", onSignal);
            resolve();
        };
        process.once("SIGINT", onSignal);
    });
}
// Personal, read-only insights. Telemetry stays on the workstation; the
// headline delivery view reads the repository's handover issues through gh,
// cached under .3c/cache/, and telemetry gates render below it. The
// --since window applies to telemetry only — the delivery view is all-time.
export async function dashboardCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    // --serve is a flag on this command rather than a new verb, so the
    // static and served surfaces cannot drift into two different dashboards.
    if (parseServeFlags(argv).serve)
        return serveDashboard(argv, env, log);
    let since;
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--since")
            since = argv[i + 1];
        else if (a?.startsWith("--since="))
            since = a.slice("--since=".length);
    }
    const src = await loadDelivery(env.cwd, env.delivery ?? defaultSourceDeps);
    const said = describeDelivery(src);
    const delivery = src.scan.records.length > 0 || src.scan.malformed > 0 ? deliveryMetrics(src.scan) : null;
    const cfg = await loadTelemetryConfig(env.cwd);
    const win = parseWindow(since, cfg.retentionDays);
    let gates = null;
    if (cfg.enabled) {
        const records = await readEventsInWindow(env.cwd, win.days, env.now ?? new Date());
        if (records.length > 0)
            gates = dashboardMetrics(records);
    }
    // Dashboard is the parity target the other commands are
    // measured against, so it renders through the shared convention itself.
    if (delivery === null && gates === null) {
        log(renderConsole({
            results: [
                cfg.enabled
                    ? `Nothing to show — no telemetry in the ${win.label} and no handover delivery data.`
                    : "Nothing to show — telemetry is disabled and there is no handover delivery data.",
                said.header,
                said.status,
                ...said.notes,
            ].join("\n"),
            meaning: said.unread
                ? "The delivery view is empty because the handover issues could not be read, not because nothing shipped."
                : "An empty dashboard is the expected state before any delivery has been recorded — not a failure.",
            nextSteps: [
                ...said.nextSteps,
                "3c dashboard --serve",
                ...(cfg.enabled ? [] : ["3c doctor   # confirms telemetry configuration"]),
            ],
        }));
        return 0;
    }
    const html = renderDashboardHtml(delivery, gates, win.label, said);
    const out = join(env.cwd, `.${resolveBrandSlugSync()}`, "dashboard.html");
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, html, "utf8");
    const shipped = delivery?.rows.length ?? 0;
    const malformed = delivery?.malformed ?? 0;
    log(renderConsole({
        results: [
            said.header,
            said.status,
            `${shipped} ${shipped === 1 ? "issue" : "issues"} shipped on record`,
            ...said.notes,
            gates !== null ? `${gates.totalRuns} gate runs in the ${win.label}` : null,
        ]
            .filter((s) => s !== null)
            .join("\n"),
        meaning: said.stale
            ? "The delivery rows are from an earlier fetch; the latest one failed."
            : malformed > 0
                ? `${malformed} ${malformed === 1 ? "handover has" : "handovers have"} malformed frontmatter, so these numbers are incomplete.`
                : "This is a static snapshot — open it to read the delivery and gate views.",
        nextSteps: [...said.nextSteps, "3c dashboard --serve   # the interactive app"],
        artifact: out,
    }));
    if (env.open)
        await env.open(out);
    return 0;
}
//# sourceMappingURL=dashboard.js.map